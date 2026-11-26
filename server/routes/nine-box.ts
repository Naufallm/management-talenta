import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
import { assert } from '../errors.ts';
import {
  identity,
  manager,
  ownEmployee,
  requireSuper,
  requireManager,
  getPeriod,
  audit,
} from '../http.ts';
import { nineBoxDataset, getNineBoxConfig, emptyNineBoxInput } from '../domain/nine-box.ts';
import {
  awardLevels,
  awardScopes,
} from '../../shared/nine-box.ts';
import { csvCell } from '../domain/import.ts';
import { nineBoxConfigSchema, nineBoxInputSchema } from '../../shared/nine-box-validation.ts';
export function nineBoxRouter(db: DB) {
  const r = Router();
  r.get('/nine-box/:periodId', async (req, res) => {
    const result = await nineBoxDataset(
      db,
      String(req.params.periodId),
      manager(res) ? '' : String(identity(res).employee_id),
      String(req.query.team || ''),
    );
    if (req.query.box) {
      const box = z.coerce.number().int().min(1).max(9).parse(req.query.box);
      result.rows = result.rows.filter((row) => row.box === box);
    }
    res.json(result);
  });
  r.get('/nine-box/:periodId/export', requireManager, async (req, res) => {
    const result = await nineBoxDataset(
      db,
      String(req.params.periodId),
      '',
      String(req.query.team || ''),
    );
    const columns = [
      'nip',
      'name',
      'unit',
      'year',
      'potential_x',
      'performance_y',
      'box',
      'missing',
      'training',
      'experience',
      'assessment',
      'education',
      'field_match',
      'ckp',
      'awards',
      'leader',
    ];
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase();
    const box = req.query.box ? z.coerce.number().int().min(1).max(9).parse(req.query.box) : null;
    const rows = result.rows
      .filter(
        (row) =>
          (box === null || row.box === box) &&
          [row.name, row.nip, row.unit].join(' ').toLowerCase().includes(q),
      )
      .map((row) => ({
        nip: row.nip,
        name: row.name,
        unit: row.unit,
        year: result.period.year,
        potential_x: row.x,
        performance_y: row.y,
        box: row.box,
        missing: row.missing.join('; '),
        ...Object.fromEntries([...row.x_parts, ...row.y_parts].map((p) => [p.key, p.contribution])),
      }));
    await audit(db, identity(res).id, 'NINE_BOX_EXPORT', `periods/${req.params.periodId}`);
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="laporan-9-box.csv"',
      })
      .send(
        '\uFEFF' +
          columns.join(',') +
          '\r\n' +
          rows
            .map((row) => columns.map((key) => csvCell(row[key as keyof typeof row])).join(','))
            .join('\r\n'),
      );
  });
  r.get('/nine-box/:periodId/config', async (req, res) => {
    await getPeriod(db, String(req.params.periodId));
    res.json(await getNineBoxConfig(db, String(req.params.periodId)));
  });
  r.put('/nine-box/:periodId/config', requireSuper, async (req, res) => {
    const settings = nineBoxConfigSchema.parse(req.body),
      periodId = String(req.params.periodId);
    await db.transaction(async (tx) => {
      const p = await getPeriod(tx, periodId, false, true);
      assert(p.status === 'OPEN', 409, 'Konfigurasi periode tertutup tidak dapat diubah.');
      await tx.query(
        'INSERT INTO nine_box_config(period_id,settings,version) VALUES($1,$2,2) ON CONFLICT(period_id) DO UPDATE SET settings=$2,version=nine_box_config.version+1,updated_at=now()',
        [periodId, JSON.stringify(settings)],
      );
      await audit(tx, identity(res).id, 'NINE_BOX_CONFIG_UPDATE', `periods/${periodId}`, {
        settings,
      });
    });
    res.json({ message: 'Konfigurasi 9 box disimpan.' });
  });
  r.get('/nine-box/:periodId/inputs/:employeeId', async (req, res) => {
    const employeeId = String(req.params.employeeId),
      periodId = String(req.params.periodId);
    ownEmployee(res, employeeId);
    const period = await getPeriod(db, periodId);
    assert(
      (await db.query('SELECT id FROM employees WHERE id=$1', [employeeId])).length,
      404,
      'Pegawai tidak ditemukan.',
    );
    const [input] = await db.query(
      'SELECT * FROM nine_box_inputs WHERE period_id=$1 AND employee_id=$2',
      [periodId, employeeId],
    );
    const education = await db.query(
      'SELECT id,level,study_program,diploma_date FROM formal_education WHERE employee_id=$1 ORDER BY diploma_date DESC',
      [employeeId],
    );
    const training = await db.query(
      'SELECT id,name,hours,verified,job_match FROM trainings WHERE period_id=$1 AND employee_id=$2 ORDER BY activity_date DESC',
      [periodId, employeeId],
    );
    const awards = await db.query(
      'SELECT id,name,award_level,award_scope,verified FROM achievements WHERE period_id=$1 AND employee_id=$2 ORDER BY activity_date DESC',
      [periodId, employeeId],
    );
    const teams = await db.query(
      'SELECT t.name,m.is_leader FROM team_members m JOIN teams t ON t.id=m.team_id WHERE m.employee_id=$1 AND m.year=$2 ORDER BY t.name',
      [employeeId, period.year],
    );
    const leaders = await db.query(
      'SELECT a.id,a.score,a.note,a.submitted_at,e.name AS leader_name FROM leader_assessments a JOIN employees e ON e.id=a.leader_id WHERE a.employee_id=$1 AND a.period_id=$2 AND a.submitted_at IS NOT NULL ORDER BY a.submitted_at DESC',
      [employeeId, periodId],
    );
    res.json({ input: input || emptyNineBoxInput, education, training, awards, teams, leaders });
  });
  r.put('/nine-box/:periodId/inputs/:employeeId', requireSuper, async (req, res) => {
    const periodId = String(req.params.periodId),
      employeeId = String(req.params.employeeId),
      d = nineBoxInputSchema.parse(req.body);
    await db.transaction(async (tx) => {
      const p = await getPeriod(tx, periodId, true, true);
      assert(
        (await tx.query('SELECT id FROM employees WHERE id=$1 AND active FOR UPDATE', [employeeId]))
          .length,
        404,
        'Pegawai aktif tidak ditemukan.',
      );
      assert(
        !d.assessment_date || Number(d.assessment_date.slice(0, 4)) <= p.year,
        422,
        'Tanggal asesmen melewati tahun periode.',
      );
      await tx.query(
        'INSERT INTO nine_box_inputs(employee_id,period_id,assessment_score,assessment_source,assessment_date,education_level,field_match,field_match_note,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(employee_id,period_id) DO UPDATE SET assessment_score=$3,assessment_source=$4,assessment_date=$5,education_level=$6,field_match=$7,field_match_note=$8,updated_by=$9,updated_at=now()',
        [
          employeeId,
          periodId,
          d.assessment_score,
          d.assessment_source,
          d.assessment_date,
          d.education_level,
          d.field_match,
          d.field_match_note,
          identity(res).id,
        ],
      );
      await audit(
        tx,
        identity(res).id,
        'NINE_BOX_INPUT_UPDATE',
        `employees/${employeeId}/periods/${periodId}`,
        d,
      );
    });
    res.json({ message: 'Komponen potensial disimpan.' });
  });
  r.patch('/nine-box/:periodId/awards/:id', requireSuper, async (req, res) => {
    const d = z
        .object({ award_level: z.enum(awardLevels), award_scope: z.enum(awardScopes) })
        .parse(req.body),
      periodId = String(req.params.periodId);
    await db.transaction(async (tx) => {
      await getPeriod(tx, periodId, true, true);
      const rows = await tx.query(
        'UPDATE achievements SET award_level=$1,award_scope=$2,updated_at=now() WHERE id=$3 AND period_id=$4 RETURNING employee_id',
        [d.award_level, d.award_scope, req.params.id, periodId],
      );
      assert(rows.length, 404, 'Penghargaan tidak ditemukan.');
      await audit(
        tx,
        identity(res).id,
        'AWARD_CLASSIFICATION_UPDATE',
        `achievements/${req.params.id}`,
        d,
      );
    });
    res.json({ message: 'Tingkat dan cakupan penghargaan disimpan.' });
  });
  return r;
}
