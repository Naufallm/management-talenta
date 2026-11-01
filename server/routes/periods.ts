import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.ts';
import {
  periodSchema,
  scoreConfigSchema,
  questionSchema,
  type ScoreConfig,
  type Question,
} from '../../shared/contracts.ts';
import { audit, identity, manager, requireManager, getPeriod } from '../http.ts';
import { assert } from '../errors.ts';
import { calculateEmployee, potentialScore } from '../domain/scoring.ts';
export function periodRouter(db: DB) {
  const r = Router();
  r.get('/periods', async (_req, res) =>
    res.json(await db.query('SELECT * FROM periods ORDER BY year DESC')),
  );
  r.post('/periods', requireManager, async (req, res) => {
    const d = periodSchema.parse(req.body),
      id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO periods VALUES($1,$2,$3,$4,$5,$6)', [
        id,
        d.year,
        d.name,
        d.starts_on,
        d.ends_on,
        d.status,
      ]);
      await tx.query('INSERT INTO score_config(period_id) VALUES($1)', [id]);
      await audit(tx, identity(res).id, 'PERIOD_CREATE', `periods/${id}`);
    });
    res.status(201).json({ id });
  });
  r.put('/periods/:id', requireManager, async (req, res) => {
    const d = periodSchema.parse(req.body);
    await db.transaction(async (tx) => {
      const period = await getPeriod(tx, String(req.params.id), false, true);
      assert(period.year === d.year, 422, 'Tahun periode tidak dapat diubah.');
      await tx.query('UPDATE periods SET name=$1,starts_on=$2,ends_on=$3,status=$4 WHERE id=$5', [
        d.name,
        d.starts_on,
        d.ends_on,
        d.status,
        req.params.id,
      ]);
      await audit(tx, identity(res).id, 'PERIOD_UPDATE', `periods/${req.params.id}`);
    });
    res.json({ message: 'Periode diperbarui.' });
  });
  r.get('/periods/:id/config', async (req, res) => {
    const [config] = await db.query('SELECT * FROM score_config WHERE period_id=$1', [
      req.params.id,
    ]);
    assert(config, 404, 'Konfigurasi tidak ditemukan.');
    res.json(config);
  });
  r.put('/periods/:id/config', requireManager, async (req, res) => {
    const d = scoreConfigSchema.parse(req.body),
      id = String(req.params.id);
    await db.transaction(async (tx) => {
      const period = await getPeriod(tx, id, false, true);
      assert(period.status !== 'CLOSED', 409, 'Konfigurasi periode tertutup tidak dapat diubah.');
      const keys = Object.keys(d);
      await tx.query(
        `UPDATE score_config SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')},version=version+1 WHERE period_id=$${keys.length + 1}`,
        [...Object.values(d), id],
      );
      const [config] = await tx.query<ScoreConfig>(
        'SELECT * FROM score_config WHERE period_id=$1',
        [id],
      );
      const questions = await tx.query<Question>(
        'SELECT * FROM potential_questions WHERE period_id=$1 AND active',
        [id],
      );
      for (const row of await tx.query(
        'SELECT * FROM potential_answers WHERE period_id=$1 AND submitted_at IS NOT NULL',
        [id],
      )) {
        const scores = potentialScore(questions, row.answers, config);
        await tx.query(
          'UPDATE potential_scores SET managerial=$1,technical=$2,score=$3,config_version=$4,calculated_at=now() WHERE employee_id=$5 AND period_id=$6',
          [scores.managerial, scores.technical, scores.score, config.version, row.employee_id, id],
        );
      }
      for (const row of await tx.query('SELECT id FROM employees'))
        await calculateEmployee(tx, row.id, id);
      await audit(tx, identity(res).id, 'SCORE_CONFIG_UPDATE', `periods/${id}`, {
        version: config.version,
      });
    });
    res.json({ message: 'Konfigurasi disimpan dan skor dihitung ulang.' });
  });
  r.get('/periods/:id/questions/:kind', async (req, res) => {
    const kind = String(req.params.kind);
    assert(['potential', 'psych'].includes(kind), 404, 'Bank soal tidak ditemukan.');
    const table = kind === 'psych' ? 'psych_questions' : 'potential_questions';
    res.json(
      await db.query(
        `SELECT * FROM ${table} WHERE period_id=$1 ${manager(res) ? '' : 'AND active'} ORDER BY sort_order,id`,
        [req.params.id],
      ),
    );
  });
  const save = async (req: any, res: any) => {
    const kind = String(req.params.kind);
    assert(['potential', 'psych'].includes(kind), 404, 'Bank soal tidak ditemukan.');
    const d = questionSchema.parse(req.body),
      id = req.params.questionId || randomUUID(),
      table = kind === 'psych' ? 'psych_questions' : 'potential_questions',
      answers = kind === 'psych' ? 'psych_answers' : 'potential_answers';
    assert(
      kind === 'psych' ? d.category === 'REFLEKSI' : d.category !== 'REFLEKSI',
      422,
      'Kategori soal tidak sesuai modul.',
    );
    await db.transaction(async (tx) => {
      const period = await getPeriod(tx, String(req.params.id), false, true);
      assert(period.status !== 'CLOSED', 409, 'Bank soal periode tertutup tidak dapat diubah.');
      assert(
        !(
          await tx.query(`SELECT employee_id FROM ${answers} WHERE period_id=$1 LIMIT 1`, [
            req.params.id,
          ])
        ).length,
        409,
        'Bank soal terkunci karena sudah ada jawaban. Buat instrumen pada periode berikutnya.',
      );
      if (req.params.questionId) {
        const rows = await tx.query(
          `UPDATE ${table} SET text=$1,category=$2,sort_order=$3,active=$4 WHERE id=$5 AND period_id=$6 RETURNING id`,
          [d.text, d.category, d.sort_order, d.active, id, req.params.id],
        );
        assert(rows.length, 404, 'Soal tidak ditemukan.');
      } else
        await tx.query(`INSERT INTO ${table} VALUES($1,$2,$3,$4,$5,$6)`, [
          id,
          req.params.id,
          d.text,
          d.category,
          d.sort_order,
          d.active,
        ]);
      await audit(tx, identity(res).id, 'QUESTION_SAVE', `${table}/${id}`);
    });
    res.json({ id, message: 'Soal disimpan.' });
  };
  r.post('/periods/:id/questions/:kind', requireManager, save);
  r.put('/periods/:id/questions/:kind/:questionId', requireManager, save);
  return r;
}
