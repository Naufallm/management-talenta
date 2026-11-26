import { periodDnaQuestions, dnaQuestionRevision } from '../domain/dna-questions.ts';
import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
import { assert } from '../errors.ts';
import { identity, ownEmployee, getPeriod, audit, requireManager, requireSuper } from '../http.ts';
import { dnaQuestions } from '../domain/dna-instrument.ts';
import { dnaVersion } from '../../shared/potential-dna.ts';
import { calculateDna, readDna, validateDnaAnswers } from '../domain/potential-dna.ts';

export function potentialDnaRouter(db: DB) {
  const router = Router();
  router.get('/potential-dna/instrument', requireManager, (_req, res) => {
    res.json({ questions: dnaQuestions });
  });
  router.get('/potential-dna/instrument/:periodId', requireManager, async (req, res) => {
    const periodId = String(req.params.periodId);
    await getPeriod(db, periodId);
    const questions = await periodDnaQuestions(db, periodId);
    res.json({ questions, revision: dnaQuestionRevision(questions) });
  });
  router.put('/potential-dna/instrument/:periodId', requireSuper, async (req, res) => {
    const d = z
      .object({
        revision: z.string().min(1),
        questions: z
          .array(z.object({ id: z.string(), text: z.string().trim().min(5).max(2000) }).strict())
          .length(30),
      })
      .parse(req.body);
    assert(
      new Set(d.questions.map((q) => q.id)).size === 30 &&
        d.questions.every((q) => dnaQuestions.some((original) => original.id === q.id)),
      422,
      'Nomor dan jumlah 30 pernyataan harus tetap lengkap.',
    );
    const periodId = String(req.params.periodId);
    await db.transaction(async (tx) => {
      const p = await getPeriod(tx, periodId, false, true);
      assert(p.status === 'OPEN', 409, 'Bank soal periode tertutup tidak dapat diedit.');
      const before = await periodDnaQuestions(tx, periodId);
      assert(
        d.revision === dnaQuestionRevision(before),
        409,
        'Bank soal sudah diperbarui. Muat ulang sebelum mengedit.',
      );
      await tx.query(
        'UPDATE potential_dna_assessments SET question_snapshot=$2 WHERE period_id=$1 AND question_snapshot IS NULL',
        [periodId, JSON.stringify(before)],
      );
      for (const q of d.questions)
        await tx.query(
          'INSERT INTO potential_dna_questions(period_id,question_id,text,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(period_id,question_id) DO UPDATE SET text=$3,updated_by=$4,updated_at=now()',
          [periodId, q.id, q.text, identity(res).id],
        );
      await audit(tx, identity(res).id, 'DNA_QUESTION_BANK_UPDATE', `periods/${periodId}`, {
        before,
        after: d.questions,
      });
    });
    res.json({ message: 'Bank soal potensi disimpan.' });
  });
  router.get('/potential-dna/history/:employeeId', async (req, res) => {
    const employeeId = String(req.params.employeeId);
    ownEmployee(res, employeeId);
    assert(
      (await db.query('SELECT id FROM employees WHERE id=$1', [employeeId])).length,
      404,
      'Pegawai tidak ditemukan.',
    );
    const rows = await db.query(
      `SELECT p.id AS period_id,p.year,p.name AS period_name,a.answers,a.submitted_at,a.updated_at
       FROM potential_dna_assessments a JOIN periods p ON p.id=a.period_id
       WHERE a.employee_id=$1 AND a.answers <> '{}'::jsonb
       ORDER BY p.year DESC,p.id`,
      [employeeId],
    );
    res.json({
      rows: rows.map(({ answers, ...row }) => ({
        ...row,
        answered_count: Object.keys(answers).length,
      })),
    });
  });
  router.get('/potential-dna/:periodId/:employeeId', async (req, res) => {
    const periodId = String(req.params.periodId),
      employeeId = String(req.params.employeeId);
    ownEmployee(res, employeeId);
    await getPeriod(db, periodId);
    assert(
      (await db.query('SELECT id FROM employees WHERE id=$1', [employeeId])).length,
      404,
      'Pegawai tidak ditemukan.',
    );
    const assessment = await readDna(db, periodId, employeeId);
    if (identity(res).role === 'PEGAWAI') {
      // Keep scoring keys and question references on the server, including after submission.
      res.json({
        ...assessment,
        questions: assessment.questions.map(({ id, number, text }) => ({ id, number, text })),
        result: assessment.result && {
          version: assessment.result.version,
          scores: assessment.result.scores,
          composition: assessment.result.composition,
          dominant: assessment.result.dominant,
          explanations: assessment.result.explanations,
          formations: assessment.result.formations.map(
            (formation: import('../../shared/potential-dna.ts').DnaFormationResult) => ({
              ...formation,
              aspects: formation.aspects.map(({ numbers: _numbers, ...aspect }) => aspect),
            }),
          ),
        },
      });
      return;
    }
    res.json(assessment);
  });
  router.put('/potential-dna/:periodId', async (req, res) => {
    const user = identity(res),
      periodId = String(req.params.periodId);
    assert(user.role === 'PEGAWAI' && user.employee_id, 403, 'Asesmen diisi melalui akun Pegawai.');
    const body = z
      .object({
        version: z.literal(dnaVersion),
        question_revision: z.string().optional(),
        instructions_accepted: z.literal(true, {
          error: 'Pahami dan setujui panduan sebelum mulai.',
        }),
        answers: z.record(z.string(), z.number().int().min(0).max(100)),
        submit: z.boolean().default(false),
      })
      .parse(req.body);
    validateDnaAnswers(body.answers, body.submit);
    await db.transaction(async (tx) => {
      await getPeriod(tx, periodId, true, true);
      const [stored] = await tx.query(
        'SELECT submitted_at,instrument_version,question_snapshot FROM potential_dna_assessments WHERE employee_id=$1 AND period_id=$2',
        [user.employee_id, periodId],
      );
      assert(
        !stored?.submitted_at,
        409,
        'Asesmen potensi tahun ini sudah dikirim. Pengisian hanya satu kali per tahun.',
      );
      assert(
        !stored || stored.instrument_version === body.version,
        409,
        'Versi instrumen berbeda. Muat ulang halaman.',
      );
      const questions = stored?.question_snapshot || (await periodDnaQuestions(tx, periodId));
      assert(
        !body.question_revision || body.question_revision === dnaQuestionRevision(questions),
        409,
        'Redaksi soal telah berubah. Muat ulang halaman sebelum melanjutkan.',
      );
      const result = body.submit ? calculateDna(body.answers, questions) : null;
      await tx.query(
        `INSERT INTO potential_dna_assessments(employee_id,period_id,instrument_version,answers,instructions_accepted_at,submitted_at,result,question_snapshot) VALUES($1,$2,$3,$4,now(),$5,$6,$7)
        ON CONFLICT(employee_id,period_id) DO UPDATE SET answers=$4,submitted_at=$5,result=$6,question_snapshot=COALESCE(potential_dna_assessments.question_snapshot,$7::jsonb),updated_at=now()`,
        [
          user.employee_id,
          periodId,
          dnaVersion,
          JSON.stringify(body.answers),
          body.submit ? new Date() : null,
          result ? JSON.stringify(result) : null,
          JSON.stringify(questions),
        ],
      );
      if (body.submit)
        await audit(
          tx,
          user.id,
          'POTENTIAL_DNA_SUBMIT',
          `potential-dna/${user.employee_id}/${periodId}`,
          { version: dnaVersion },
        );
    });
    res.json({
      message: body.submit
        ? 'Asesmen potensi dikirim dan dikunci untuk tahun ini.'
        : 'Draft potensi tersimpan.',
    });
  });
  return router;
}
