import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
import { ckpSchema } from '../../shared/contracts.ts';
import { identity, manager, requireManager, requireSuper, audit, pageParams } from '../http.ts';
import { assert } from '../errors.ts';
import { upload } from './evidence.ts';
import { importRows, validateImport, csvCell } from '../domain/import.ts';
import { ckpTemplate } from '../domain/ckp-files.ts';
async function checkCkpYears(tx: DB, years: number[]) {
  const periods = await tx.query(
    'SELECT status FROM periods WHERE year=ANY($1::int[]) ORDER BY year FOR SHARE',
    [years],
  );
  assert(
    periods.every((p) => p.status !== 'CLOSED'),
    409,
    'Periode ditutup. Buka kembali periode sebelum mengubah CKP.',
  );
}
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
  r.get('/ckp/employees', async (req, res) => {
    const year = z.coerce.number().int().min(2020).max(2100).parse(req.query.year);
    const month = z.coerce.number().int().min(1).max(12).parse(req.query.month);
    const employeeId = manager(res) ? '' : identity(res).employee_id;
    const rows = await db.query(
      `SELECT e.id AS employee_id,e.name,e.nip,c.score FROM employees e
       LEFT JOIN ckp_scores c ON c.employee_id=e.id AND c.year=$1 AND c.month=$2
       WHERE e.active AND ($3='' OR e.id=$3) ORDER BY e.name,e.id`,
      [year, month, employeeId],
    );
    res.json({ year, month, rows });
  });
  r.get('/ckp/trends', async (req, res) => {
    const year = z.coerce.number().int().min(2020).max(2100).parse(req.query.year);
    const employeeId = manager(res) ? '' : identity(res).employee_id;
    const rows = await db.query(
      `SELECT e.id AS employee_id,e.name,e.nip,c.month,c.score FROM employees e
       LEFT JOIN ckp_scores c ON c.employee_id=e.id AND c.year=$1
       WHERE e.active AND ($2='' OR e.id=$2) ORDER BY e.name,e.id,c.month`,
      [year, employeeId],
    );
    const employees = new Map<
      string,
      {
        employee_id: string;
        name: string;
        nip: string;
        trend: { month: number; score: number | null }[];
      }
    >();
    for (const row of rows) {
      if (!employees.has(row.employee_id))
        employees.set(row.employee_id, {
          employee_id: row.employee_id,
          name: row.name,
          nip: row.nip,
          trend: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, score: null })),
        });
      if (row.month != null) employees.get(row.employee_id)!.trend[row.month - 1].score = row.score;
    }
    res.json({ year, employees: [...employees.values()] });
  });
  r.get('/ckp/template', requireManager, async (req, res) => {
    const year = z.coerce.number().int().min(2020).max(2100).parse(req.query.year);
    const month = z.coerce.number().int().min(1).max(12).parse(req.query.month);
    const employees = await db.query<{ nip: string; name: string }>(
      'SELECT nip,name FROM employees WHERE active ORDER BY name,id',
    );
    const workbook = await ckpTemplate(employees, month, year);
    res
      .set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-capaian-kinerja-pegawai-${year}-${String(month).padStart(2, '0')}.xlsx"`,
        'Cache-Control': 'no-store',
      })
      .send(workbook);
  });
  r.get('/ckp/export', async (req, res) => {
    const year = z.coerce.number().int().min(2020).max(2100).parse(req.query.year);
    const month = z.coerce
      .number()
      .int()
      .min(0)
      .max(12)
      .parse(req.query.month ?? 0);
    const employeeId = manager(res)
      ? String(req.query.employee_id || '')
      : identity(res).employee_id;
    const rows = await db.query(
      `SELECT e.nip,e.name AS nama,c.month AS bulan,c.year AS tahun,c.score AS skor
       FROM ckp_scores c JOIN employees e ON e.id=c.employee_id
       WHERE c.year=$1 AND ($2='' OR e.id=$2) AND ($3::int=0 OR c.month=$3)
       ORDER BY e.name,e.id,c.month`,
      [year, employeeId, month],
    );
    const headers = ['nip', 'nama', 'bulan', 'tahun', 'skor'];
    const text =
      '\uFEFF' +
      headers.join(',') +
      '\r\n' +
      rows.map((row) => headers.map((key) => csvCell(row[key])).join(',')).join('\r\n');
    await audit(db, identity(res).id, 'CKP_EXPORT', 'ckp', {
      year,
      month,
      employee_id: employeeId,
      total: rows.length,
    });
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hasil-capaian-kinerja-pegawai-${year}${month ? '-' + String(month).padStart(2, '0') : ''}.csv"`,
        'Cache-Control': 'no-store',
      })
      .send(text);
  });
  r.get('/ckp/matrix', async (req, res) => {
    const year = z.coerce.number().int().min(2020).max(2100).parse(req.query.year);
    const month = z.coerce
      .number()
      .int()
      .min(0)
      .max(12)
      .parse(req.query.month ?? 0);
    const employeeId = manager(res)
      ? String(req.query.employee_id || '')
      : identity(res).employee_id;
    const { page, limit } = pageParams(req);
    const csv = req.query.format === 'csv';
    const condition = "c.year=$1 AND ($2='' OR e.id=$2) AND ($3::int=0 OR c.month=$3)";
    const rows = await db.query(
      `SELECT e.id AS employee_id,e.name,e.nip,jsonb_object_agg(c.month::text,jsonb_build_object('id',c.id,'score',c.score)) AS values
       FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition}
       GROUP BY e.id,e.name,e.nip ORDER BY e.name,e.id${csv ? '' : ' LIMIT $4 OFFSET $5'}`,
      csv ? [year, employeeId, month] : [year, employeeId, month, limit, (page - 1) * limit],
    );
    if (csv) {
      const selectedMonths = month ? [month] : Array.from({ length: 12 }, (_, index) => index + 1);
      const text =
        '\uFEFF' +
        ['nip', 'nama', ...selectedMonths.map((value) => `bulan_${value}`)].join(',') +
        '\r\n' +
        rows
          .map((row) =>
            [row.nip, row.name, ...selectedMonths.map((value) => row.values[value]?.score ?? '')]
              .map(csvCell)
              .join(','),
          )
          .join('\r\n');
      await audit(db, identity(res).id, 'CKP_EXPORT', 'ckp', {
        year,
        month,
        employee_id: employeeId,
        total: rows.length,
        layout: 'matrix',
      });
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="hasil-capaian-kinerja-pegawai-${year}${month ? '-' + String(month).padStart(2, '0') : ''}.csv"`,
        })
        .send(text);
      return;
    }
    const [count] = await db.query(
      `SELECT count(DISTINCT e.id)::int AS total FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition}`,
      [year, employeeId, month],
    );
    res.json({ year, month, rows, total: count.total, page, limit });
  });
  r.get('/ckp', async (req, res) => {
    const year = z.coerce
        .number()
        .int()
        .min(2020)
        .max(2100)
        .parse(req.query.year || 2026),
      employeeId = manager(res) ? String(req.query.employee_id || '') : identity(res).employee_id;
    const month = z.coerce
      .number()
      .int()
      .min(0)
      .max(12)
      .parse(req.query.month ?? 0);
    const { page, limit } = pageParams(req);
    const condition = "c.year=$1 AND ($2='' OR e.id=$2) AND ($3::int=0 OR c.month=$3)";
    const rows = await db.query(
      `SELECT c.id,c.employee_id,c.month,c.year,c.score,e.name,e.nip FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition} ORDER BY e.name,e.id,c.month LIMIT $4 OFFSET $5`,
      [year, employeeId, month, limit, (page - 1) * limit],
    );
    const monthly = await db.query(
      `SELECT c.month,avg(c.score)::real AS score,count(*)::int AS count FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition} GROUP BY c.month`,
      [year, employeeId, month],
    );
    const [summary] = await db.query(
      `SELECT count(*)::int AS total,avg(c.score)::real AS average FROM ckp_scores c JOIN employees e ON e.id=c.employee_id WHERE ${condition}`,
      [year, employeeId, month],
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
      await checkCkpYears(tx, [d.year]);
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
    res.status(201).json({ id, message: 'Nilai Capaian Kinerja Pegawai disimpan.' });
  });
  r.put('/ckp/yearly', requireSuper, async (req, res) => {
    const d = z
      .object({
        employee_id: z.string().min(1),
        year: z.number().int().min(2020).max(2100),
        values: z
          .array(
            z.object({
              month: z.number().int().min(1).max(12),
              score: z.number().min(0).max(100).nullable(),
            }),
          )
          .length(12),
      })
      .refine((value) => new Set(value.values.map((v) => v.month)).size === 12, {
        message: 'Isi nilai untuk dua belas bulan yang berbeda.',
      })
      .parse(req.body);
    await db.transaction(async (tx) => {
      await checkCkpYears(tx, [d.year]);
      assert(
        (
          await tx.query('SELECT id FROM employees WHERE id=$1 AND active FOR UPDATE', [
            d.employee_id,
          ])
        ).length,
        422,
        'Pegawai aktif tidak ditemukan.',
      );
      const before = await tx.query(
        'SELECT month,score FROM ckp_scores WHERE employee_id=$1 AND year=$2 ORDER BY month',
        [d.employee_id, d.year],
      );
      for (const value of d.values) {
        if (value.score === null)
          await tx.query('DELETE FROM ckp_scores WHERE employee_id=$1 AND year=$2 AND month=$3', [
            d.employee_id,
            d.year,
            value.month,
          ]);
        else
          await tx.query(
            'INSERT INTO ckp_scores(id,employee_id,month,year,score,created_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(employee_id,month,year) DO UPDATE SET score=$5,updated_at=now()',
            [randomUUID(), d.employee_id, value.month, d.year, value.score, identity(res).id],
          );
      }
      await audit(
        tx,
        identity(res).id,
        'CKP_YEARLY_UPDATE',
        `employees/${d.employee_id}/ckp/${d.year}`,
        { before, after: d.values },
      );
    });
    res.json({ message: 'Nilai CKP tahunan disimpan.' });
  });
  r.put('/ckp/:id', requireManager, async (req, res) => {
    const d = ckpSchema.parse(req.body);
    await db.transaction(async (tx) => {
      const [old] = await tx.query('SELECT year FROM ckp_scores WHERE id=$1 FOR UPDATE', [
        req.params.id,
      ]);
      await checkCkpYears(tx, old ? [old.year, d.year] : [d.year]);
      const rows = await tx.query(
        'UPDATE ckp_scores SET employee_id=$1,month=$2,year=$3,score=$4,updated_at=now() WHERE id=$5 RETURNING id',
        [d.employee_id, d.month, d.year, d.score, req.params.id],
      );
      assert(rows.length, 404, 'Nilai Capaian Kinerja Pegawai tidak ditemukan.');
      await audit(tx, identity(res).id, 'CKP_UPDATE', `ckp/${req.params.id}`);
    });
    res.json({ message: 'Nilai Capaian Kinerja Pegawai diperbarui.' });
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
      await checkCkpYears(tx, [...new Set(validated.map((row) => Number(row.year)))]);
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
    res.json({ message: `${total} nilai Capaian Kinerja Pegawai berhasil diimpor.`, total });
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
      `SELECT e.id AS employee_id,e.nip,e.name,e.unit,p.year,s.score AS potential,c.score AS competency,q.quadrant,ckp.average AS ckp FROM employees e JOIN periods p ON p.id=$1 LEFT JOIN potential_scores s ON s.employee_id=e.id AND s.period_id=p.id LEFT JOIN competency_scores c ON c.employee_id=e.id AND c.period_id=p.id LEFT JOIN quadrant_results q ON q.employee_id=e.id AND q.period_id=p.id LEFT JOIN LATERAL(SELECT avg(score)::real AS average FROM ckp_scores WHERE employee_id=e.id AND year=p.year) ckp ON true WHERE e.active ORDER BY e.name,e.id${isCsv ? '' : ' LIMIT $2 OFFSET $3'}`,
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
