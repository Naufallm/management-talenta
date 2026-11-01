import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.ts';
import {
  answerSchema,
  leaderSchema,
  indicators,
  type Question,
  type ScoreConfig,
} from '../../shared/contracts.ts';
import { assert } from '../errors.ts';
import { audit, identity, requireManager, getPeriod, ownEmployee } from '../http.ts';
import { potentialScore, calculateEmployee, round } from '../domain/scoring.ts';
import { encrypt, decrypt } from '../security.ts';
export function assessmentRouter(db: DB) {
  const r = Router();
  r.get('/assessments/:kind/:periodId/:employeeId', async (req, res) => {
    const { kind, periodId, employeeId } = req.params,
      u = identity(res);
    assert(['potential', 'psych'].includes(String(kind)), 404, 'Asesmen tidak ditemukan.');
    if (kind === 'psych') {
      const allowed =
        u.role === 'SUPER_ADMIN' || (u.role === 'PEGAWAI' && u.employee_id === employeeId);
      if (!allowed) await audit(db, u.id, 'PSYCH_ACCESS_DENIED', `psych/${employeeId}/${periodId}`);
      assert(allowed, 403, 'Anda tidak memiliki akses data psikologi.');
    } else ownEmployee(res, String(employeeId));
    const table = kind === 'psych' ? 'psych_answers' : 'potential_answers';
    const [row] = await db.query(`SELECT * FROM ${table} WHERE employee_id=$1 AND period_id=$2`, [
      employeeId,
      periodId,
    ]);
    if (kind === 'psych') {
      await audit(db, u.id, 'PSYCH_READ', `psych/${employeeId}/${periodId}`);
      const [result] = await db.query(
        'SELECT encrypted_result FROM psych_results WHERE employee_id=$1 AND period_id=$2',
        [employeeId, periodId],
      );
      res.json({
        answers: row ? decrypt(row.encrypted_answers) : {},
        submitted_at: row?.submitted_at || null,
        result: result
          ? decrypt(result.encrypted_result)
          : {
              status: 'Belum dapat dihitung',
              message:
                'Instrumen dan aturan skoring menunggu validasi psikolog. Tidak ada kategori klinis yang dihitung.',
            },
      });
    } else res.json({ answers: row?.answers || {}, submitted_at: row?.submitted_at || null });
  });
  r.put('/assessments/:kind/:periodId', async (req, res) => {
    const u = identity(res),
      kind = String(req.params.kind),
      periodId = String(req.params.periodId);
    assert(u.role === 'PEGAWAI' && u.employee_id, 403, 'Asesmen diisi melalui akun Pegawai.');
    assert(['potential', 'psych'].includes(kind), 404, 'Asesmen tidak ditemukan.');
    const d = answerSchema.parse(req.body),
      table = kind === 'psych' ? 'psych_answers' : 'potential_answers';
    await db.transaction(async (tx) => {
      await getPeriod(tx, periodId, true);
      const [stored] = await tx.query(
        `SELECT submitted_at FROM ${table} WHERE employee_id=$1 AND period_id=$2`,
        [u.employee_id, periodId],
      );
      assert(!stored?.submitted_at, 409, 'Jawaban sudah dikirim dan terkunci.');
      const questions = await tx.query<Question>(
        `SELECT * FROM ${kind === 'psych' ? 'psych_questions' : 'potential_questions'} WHERE period_id=$1 AND active ORDER BY sort_order`,
        [periodId],
      );
      assert(questions.length > 0, 422, 'Bank soal belum tersedia.');
      assert(
        Object.keys(d.answers).every((id) => questions.some((q) => q.id === id)),
        422,
        'Jawaban memuat soal yang tidak berlaku.',
      );
      if (d.submit)
        assert(
          questions.every((q) => d.answers[q.id] !== undefined),
          422,
          'Lengkapi semua jawaban sebelum mengirim.',
        );
      const value = kind === 'psych' ? encrypt(d.answers) : JSON.stringify(d.answers),
        column = kind === 'psych' ? 'encrypted_answers' : 'answers';
      await tx.query(
        `INSERT INTO ${table}(employee_id,period_id,${column},submitted_at) VALUES($1,$2,$3,$4) ON CONFLICT(employee_id,period_id) DO UPDATE SET ${column}=$3,submitted_at=$4,updated_at=now()`,
        [u.employee_id, periodId, value, d.submit ? new Date() : null],
      );
      if (d.submit && kind === 'potential') {
        const [config] = await tx.query<ScoreConfig>(
            'SELECT * FROM score_config WHERE period_id=$1',
            [periodId],
          ),
          s = potentialScore(questions, d.answers, config);
        await tx.query(
          'INSERT INTO potential_scores(employee_id,period_id,managerial,technical,score,config_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(employee_id,period_id) DO UPDATE SET managerial=$3,technical=$4,score=$5,config_version=$6,calculated_at=now()',
          [u.employee_id, periodId, s.managerial, s.technical, s.score, config.version],
        );
        await calculateEmployee(tx, String(u.employee_id), periodId);
      }
      if (d.submit && kind === 'psych')
        await tx.query(
          'INSERT INTO psych_results VALUES($1,$2,$3,now()) ON CONFLICT(employee_id,period_id) DO UPDATE SET encrypted_result=$3,updated_at=now()',
          [
            u.employee_id,
            periodId,
            encrypt({
              status: 'Belum dapat dihitung',
              message:
                'Instrumen dan aturan skoring menunggu validasi psikolog. Tidak ada kategori klinis yang dihitung.',
            }),
          ],
        );
      await audit(
        tx,
        u.id,
        d.submit ? 'ASSESSMENT_SUBMIT' : 'ASSESSMENT_DRAFT',
        `${kind}/${u.employee_id}/${periodId}`,
      );
    });
    res.json({ message: d.submit ? 'Jawaban dikirim dan dikunci.' : 'Draft jawaban disimpan.' });
  });
  r.post(
    '/assessments/potential/:periodId/:employeeId/reopen',
    requireManager,
    async (req, res) => {
      const { periodId, employeeId } = req.params;
      const reason = String(req.body.reason || '').trim();
      assert(
        reason.length >= 10 && reason.length <= 500,
        422,
        'Alasan pembukaan kembali minimal 10 karakter.',
      );
      await db.transaction(async (tx) => {
        await getPeriod(tx, String(periodId), true);
        const rows = await tx.query(
          'UPDATE potential_answers SET submitted_at=null WHERE employee_id=$1 AND period_id=$2 RETURNING employee_id',
          [employeeId, periodId],
        );
        assert(rows.length, 404, 'Jawaban belum tersedia.');
        await tx.query('DELETE FROM potential_scores WHERE employee_id=$1 AND period_id=$2', [
          employeeId,
          periodId,
        ]);
        await calculateEmployee(tx, String(employeeId), String(periodId));
        await audit(
          tx,
          identity(res).id,
          'POTENTIAL_REOPEN',
          `potential/${employeeId}/${periodId}`,
          { reason },
        );
      });
      res.json({ message: 'Asesmen dibuka kembali. Skor lama dibatalkan.' });
    },
  );
  r.get('/assessment-overview/:periodId', requireManager, async (req, res) =>
    res.json(
      await db.query(
        `SELECT e.id,e.name,e.nip,e.unit,a.submitted_at,s.score AS potential,c.score AS competency FROM employees e LEFT JOIN potential_answers a ON a.employee_id=e.id AND a.period_id=$1 LEFT JOIN potential_scores s ON s.employee_id=e.id AND s.period_id=$1 LEFT JOIN competency_scores c ON c.employee_id=e.id AND c.period_id=$1 WHERE e.active ORDER BY e.name`,
        [req.params.periodId],
      ),
    ),
  );
  r.get('/leader/:periodId', async (req, res) => {
    const u = identity(res);
    assert(
      u.role === 'PEGAWAI' && u.employee_id,
      403,
      'Akses hanya untuk pegawai dengan penugasan Ketua Tim.',
    );
    const p = await getPeriod(db, String(req.params.periodId));
    const rows = await db.query(
      `SELECT DISTINCT e.id,e.name,e.position,t.name AS team,a.indicators,a.note,a.submitted_at,a.score FROM team_members l JOIN team_members m ON m.team_id=l.team_id AND m.year=l.year JOIN employees e ON e.id=m.employee_id JOIN teams t ON t.id=m.team_id LEFT JOIN leader_assessments a ON a.employee_id=e.id AND a.leader_id=$1 AND a.period_id=$3 WHERE l.employee_id=$1 AND l.is_leader AND l.year=$2 AND m.employee_id<>$1 AND e.active ORDER BY e.name`,
      [u.employee_id, p.year, req.params.periodId],
    );
    res.json(rows);
  });
  r.put('/leader/:periodId', async (req, res) => {
    const u = identity(res),
      periodId = String(req.params.periodId),
      d = leaderSchema.parse(req.body);
    assert(u.role === 'PEGAWAI' && u.employee_id, 403, 'Akses hanya untuk Ketua Tim.');
    assert(
      Object.keys(d.indicators).every((key) => indicators.includes(key as any)),
      422,
      'Indikator tidak dikenal.',
    );
    if (d.submit)
      assert(
        indicators.every((key) => d.indicators[key] !== undefined),
        422,
        'Lengkapi seluruh indikator.',
      );
    await db.transaction(async (tx) => {
      const p = await getPeriod(tx, periodId, true);
      const assigned = await tx.query(
        `SELECT m.id FROM team_members l JOIN team_members m ON m.team_id=l.team_id AND m.year=l.year JOIN employees e ON e.id=m.employee_id WHERE l.employee_id=$1 AND l.is_leader AND l.year=$2 AND m.employee_id=$3 AND m.employee_id<>$1 AND e.active`,
        [u.employee_id, p.year, d.employee_id],
      );
      assert(assigned.length, 403, 'Pegawai tersebut bukan anggota yang ditugaskan kepada Anda.');
      const [stored] = await tx.query(
        'SELECT submitted_at FROM leader_assessments WHERE employee_id=$1 AND leader_id=$2 AND period_id=$3',
        [d.employee_id, u.employee_id, periodId],
      );
      assert(!stored?.submitted_at, 409, 'Penilaian sudah dikirim dan terkunci.');
      const score = d.submit
        ? round(indicators.reduce((s, key) => s + d.indicators[key], 0) / indicators.length)
        : null;
      await tx.query(
        'INSERT INTO leader_assessments VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(period_id,employee_id,leader_id) DO UPDATE SET indicators=$5,note=$6,score=$7,submitted_at=$8',
        [
          randomUUID(),
          periodId,
          d.employee_id,
          u.employee_id,
          JSON.stringify(d.indicators),
          d.note,
          score,
          d.submit ? new Date() : null,
        ],
      );
      await calculateEmployee(tx, d.employee_id, periodId);
      await audit(
        tx,
        u.id,
        d.submit ? 'LEADER_SUBMIT' : 'LEADER_DRAFT',
        `leader/${d.employee_id}/${periodId}`,
      );
    });
    res.json({ message: d.submit ? 'Penilaian dikirim.' : 'Draft penilaian disimpan.' });
  });
  return r;
}
