import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
import { ckpSchema } from '../../shared/contracts.ts';
import { identity, manager, requireManager, requireSuper, audit, pageParams } from '../http.ts';
import { assert } from '../errors.ts';
import { upload } from './evidence.ts';
import { importRows, validateImport, csvCell } from '../domain/import.ts';
export function analyticsRouter(db: DB) {
  const r = Router();
  r.get('/talent/:periodId', async (req, res) => {
    const employeeId = manager(res) ? '' : identity(res).employee_id,
      team = String(req.query.team || ''),
      quadrant = String(req.query.quadrant || '');
    res.json(
      await db.query(
        `SELECT q.*,e.name,e.nip,e.unit,p.year FROM quadrant_results q JOIN employees e ON e.id=q.employee_id JOIN periods p ON p.id=q.period_id WHERE q.period_id=$1 AND e.active AND ($2='' OR e.id=$2) AND ($3='' OR EXISTS(SELECT 1 FROM team_members tm WHERE tm.employee_id=e.id AND tm.year=p.year AND tm.team_id=$3)) AND ($4='' OR q.quadrant=$4) ORDER BY e.name`,
        [req.params.periodId, employeeId, team, quadrant],
      ),
    );
  });
  r.get('/ckp', async (req, res) => {
    const year = z.coerce
        .number()
        .int()
        .min(2020)
        .max(2100)
        .parse(req.query.year || 2026),
      employeeId = manager(res) ? String(req.query.employee_id || '') : identity(res).employee_id;
    const { page, limit } = pageParams(req);
    const condition = "c.year=$1 AND ($2='' OR e.id=$2)";
    const rows = await db.query(
      `SELECT c.id,c.employee_id,c.month,c.year,c.score,e.name,e.nip FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition} ORDER BY e.name,e.id,c.month LIMIT $3 OFFSET $4`,
      [year, employeeId, limit, (page - 1) * limit],
    );
    const monthly = await db.query(
      `SELECT c.month,avg(c.score)::real AS score,count(*)::int AS count FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition} GROUP BY c.month`,
      [year, employeeId],
    );
    const [summary] = await db.query(
      `SELECT count(*)::int AS total,avg(c.score)::real AS average FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition}`,
      [year, employeeId],
    );
    const trend = Array.from({ length: 12 }, (_, i) => {
      const item = monthly.find((v) => v.month === i + 1);
      return {
        month: i + 1,
        score: item ? Math.round(item.score * 100) / 100 : null,
        count: item?.count || 0,
      };
    });
    res.json({
      rows,
      trend,
      average: summary.average == null ? null : Math.round(summary.average * 100) / 100,
      total: summary.total,
      page,
      limit,
    });
  });
  r.post('/ckp', requireManager, async (req, res) => {
    const d = ckpSchema.parse(req.body),
      id = randomUUID();
    await db.transaction(async (tx) => {
      assert(
        (await tx.query('SELECT id FROM employees WHERE id=$1 AND active', [d.employee_id])).length,
        422,
        'Pegawai tidak aktif atau tidak ditemukan.',
      );
      await tx.query(
        'INSERT INTO ckp_scores(id,employee_id,month,year,score,created_by) VALUES($1,$2,$3,$4,$5,$6)',
        [id, d.employee_id, d.month, d.year, d.score, identity(res).id],
      );
      await audit(tx, identity(res).id, 'CKP_CREATE', `ckp/${id}`);
    });
    res.status(201).json({ id, message: 'Nilai CKP disimpan.' });
  });
  r.put('/ckp/:id', requireManager, async (req, res) => {
    const d = ckpSchema.parse(req.body);
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'UPDATE ckp_scores SET employee_id=$1,month=$2,year=$3,score=$4,updated_at=now() WHERE id=$5 RETURNING id',
        [d.employee_id, d.month, d.year, d.score, req.params.id],
      );
      assert(rows.length, 404, 'Nilai CKP tidak ditemukan.');
      await audit(tx, identity(res).id, 'CKP_UPDATE', `ckp/${req.params.id}`);
    });
    res.json({ message: 'Nilai CKP diperbarui.' });
  });
  r.post('/ckp/import', requireManager, upload.single('file'), async (req, res) => {
    assert(req.file, 422, 'Pilih berkas impor.');
    const rows = await importRows(req.file.buffer, req.file.originalname);
    if (req.body.action !== 'commit') {
      res.json({ rows: await validateImport(db, rows) });
      return;
    }
    let total = 0;
    await db.transaction(async (tx) => {
      // Uniqueness constraints also protect against another concurrent import.
      const validated = await validateImport(tx, rows);
      assert(
        validated.every((r) => !r.error),
        422,
        'Impor dibatalkan. Perbaiki semua baris terlebih dahulu.',
      );
      for (const d of validated)
        await tx.query(
          'INSERT INTO ckp_scores(id,employee_id,month,year,score,created_by) VALUES($1,$2,$3,$4,$5,$6)',
          [
            randomUUID(),
            d.employee_id,
            Number(d.month),
            Number(d.year),
            Number(d.score),
            identity(res).id,
          ],
        );
      total = validated.length;
      await audit(tx, identity(res).id, 'CKP_IMPORT', 'ckp', { total });
    });
    res.json({ message: `${total} nilai CKP berhasil diimpor.`, total });
  });
  r.get('/dashboard/:periodId', async (req, res) => {
    const isManager = manager(res),
      employeeId = isManager ? '' : identity(res).employee_id;
    const [period] = await db.query('SELECT * FROM periods WHERE id=$1', [req.params.periodId]);
    assert(period, 404, 'Periode tidak ditemukan.');
    const [summary] = await db.query(
      `SELECT count(*)::int AS employees,count(a.submitted_at)::int AS submitted,avg(c.score)::real AS competency FROM employees e LEFT JOIN potential_answers a ON a.employee_id=e.id AND a.period_id=$1 LEFT JOIN competency_scores c ON c.employee_id=e.id AND c.period_id=$1 WHERE e.active AND ($2='' OR e.id=$2)`,
      [req.params.periodId, employeeId],
    );
    const [ckp] = await db.query(
      `SELECT avg(score)::real AS average FROM ckp_scores WHERE year=$1 AND ($2='' OR employee_id=$2)`,
      [period.year, employeeId],
    );
    const [excellent] = await db.query(
      `SELECT count(*)::int AS total FROM quadrant_results q JOIN employees e ON e.id=q.employee_id WHERE q.period_id=$1 AND e.active AND q.quadrant='Talenta Unggul' AND ($2='' OR e.id=$2)`,
      [req.params.periodId, employeeId],
    );
    res.json({ ...summary, ckp: ckp.average, excellent: excellent.total });
  });
  r.get('/reports/:periodId', requireManager, async (req, res) => {
    const [period] = await db.query('SELECT id FROM periods WHERE id=$1', [req.params.periodId]);
    assert(period, 404, 'Periode tidak ditemukan.');
    const { page, limit } = pageParams(req),
      isCsv = req.query.format === 'csv';
    const rows = await db.query(
      `SELECT e.nip,e.name,e.unit,p.year,s.score AS potential,c.score AS competency,q.quadrant,ckp.average AS ckp FROM employees e JOIN periods p ON p.id=$1 LEFT JOIN potential_scores s ON s.employee_id=e.id AND s.period_id=p.id LEFT JOIN competency_scores c ON c.employee_id=e.id AND c.period_id=p.id LEFT JOIN quadrant_results q ON q.employee_id=e.id AND q.period_id=p.id LEFT JOIN LATERAL(SELECT avg(score)::real AS average FROM ckp_scores WHERE employee_id=e.id AND year=p.year) ckp ON true WHERE e.active ORDER BY e.name,e.id${isCsv ? '' : ' LIMIT $2 OFFSET $3'}`,
      isCsv ? [req.params.periodId] : [req.params.periodId, limit, (page - 1) * limit],
    );
    if (req.query.format === 'csv') {
      const headers = ['nip', 'name', 'unit', 'year', 'potential', 'competency', 'quadrant', 'ckp'];
      const text =
        '\uFEFF' +
        headers.join(',') +
        '\r\n' +
        rows.map((row) => headers.map((k) => csvCell(row[k])).join(',')).join('\r\n');
      await audit(db, identity(res).id, 'REPORT_EXPORT', `reports/${req.params.periodId}`);
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="laporan-talenta.csv"',
        })
        .send(text);
    } else {
      const [count] = await db.query('SELECT count(*)::int AS total FROM employees WHERE active');
      res.json({ rows, total: count.total, page, limit });
    }
  });
  r.get('/audit-logs', requireSuper, async (req, res) => {
    const { page, limit } = pageParams(req),
      [count] = await db.query('SELECT count(*)::int AS total FROM audit_logs');
    const rows = await db.query(
      'SELECT a.*,u.username FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id LIMIT $1 OFFSET $2',
      [limit, (page - 1) * limit],
    );
    res.json({ rows, total: count.total, page, limit });
  });
  return r;
}
