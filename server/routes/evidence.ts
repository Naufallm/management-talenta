import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import type { DB } from '../db/index.ts';
import { evidenceSchema } from '../../shared/contracts.ts';
import { assert } from '../errors.ts';
import { ownEmployee, identity, manager, audit, getPeriod, requireManager } from '../http.ts';
import { calculateEmployee } from '../domain/scoring.ts';
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 10 },
});
export function evidenceRouter(db: DB) {
  const r = Router();
  async function mayWrite(tx: DB, res: any, employeeId: string, periodId: string) {
    ownEmployee(res, employeeId);
    await getPeriod(tx, periodId, true);
  }
  r.post('/documents', upload.single('file'), async (req, res) => {
    const employeeId = String(req.body.employee_id || ''),
      periodId = String(req.body.period_id || ''),
      file = req.file;
    assert(file, 422, 'Pilih dokumen.');
    const bytes = file.buffer;
    const mime =
      bytes.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? 'image/jpeg'
            : null;
    assert(mime, 422, 'Dokumen harus berupa PDF, PNG, atau JPEG yang valid (maks. 2 MB).');
    const id = randomUUID(),
      name = file.originalname.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 150) || 'dokumen';
    await db.transaction(async (tx) => {
      await mayWrite(tx, res, employeeId, periodId);
      await tx.query(
        'INSERT INTO documents(id,employee_id,name,mime,contents) VALUES($1,$2,$3,$4,$5)',
        [id, employeeId, name, mime, bytes],
      );
      await audit(tx, identity(res).id, 'DOCUMENT_UPLOAD', `documents/${id}`);
    });
    res.status(201).json({ id, name });
  });
  r.get('/documents/:id', async (req, res) => {
    const [d] = await db.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
    assert(d, 404, 'Dokumen tidak ditemukan.');
    ownEmployee(res, d.employee_id);
    await audit(db, identity(res).id, 'DOCUMENT_READ', `documents/${d.id}`);
    res
      .set({
        'Content-Type': d.mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(d.name)}"`,
        'X-Content-Type-Options': 'nosniff',
      })
      .send(Buffer.from(d.contents));
  });
  r.post('/evidence/:periodId', async (req, res) => {
    const d = evidenceSchema.parse(req.body),
      periodId = String(req.params.periodId),
      id = randomUUID();
    await db.transaction(async (tx) => {
      await mayWrite(tx, res, d.employee_id, periodId);
      const [p] = await tx.query('SELECT year FROM periods WHERE id=$1', [periodId]);
      assert(
        Number(d.activity_date.slice(0, 4)) === p.year,
        422,
        'Tanggal kegiatan harus berada pada tahun periode.',
      );
      if (d.document_id)
        assert(
          (
            await tx.query('SELECT id FROM documents WHERE id=$1 AND employee_id=$2', [
              d.document_id,
              d.employee_id,
            ])
          ).length,
          422,
          'Dokumen tidak sesuai pegawai.',
        );
      assert(
        !d.verified || !manager(res) || d.document_id,
        422,
        'Lampirkan dokumen sebelum memverifikasi kegiatan.',
      );
      await tx.query(
        `INSERT INTO ${d.kind === 'training' ? 'trainings' : 'achievements'} VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          d.employee_id,
          periodId,
          d.name,
          d.activity_type,
          d.activity_date,
          d.organizer,
          d.hours,
          d.document_id,
          manager(res) && d.verified,
          identity(res).id,
        ],
      );
      await calculateEmployee(tx, d.employee_id, periodId);
      await audit(tx, identity(res).id, 'EVIDENCE_CREATE', `evidence/${id}`);
    });
    res.status(201).json({ id, message: 'Bukti kompetensi disimpan.' });
  });
  r.patch('/evidence/:kind/:id/verify', requireManager, async (req, res) => {
    assert(
      ['training', 'achievement'].includes(String(req.params.kind)),
      404,
      'Jenis bukti tidak dikenal.',
    );
    assert(typeof req.body.verified === 'boolean', 422, 'Status verifikasi tidak valid.');
    const table = req.params.kind === 'training' ? 'trainings' : 'achievements';
    await db.transaction(async (tx) => {
      const [d] = await tx.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      assert(d, 404, 'Bukti tidak ditemukan.');
      await getPeriod(tx, d.period_id, true);
      assert(
        !req.body.verified || d.document_id,
        422,
        'Lampirkan dokumen sebelum memverifikasi kegiatan.',
      );
      await tx.query(`UPDATE ${table} SET verified=$1 WHERE id=$2`, [
        req.body.verified,
        req.params.id,
      ]);
      await calculateEmployee(tx, d.employee_id, d.period_id);
      await audit(tx, identity(res).id, 'EVIDENCE_VERIFY', `evidence/${d.id}`);
    });
    res.json({ message: 'Verifikasi diperbarui.' });
  });
  r.delete('/evidence/:kind/:id', requireManager, async (req, res) => {
    assert(
      ['training', 'achievement'].includes(String(req.params.kind)),
      404,
      'Jenis bukti tidak dikenal.',
    );
    const table = req.params.kind === 'training' ? 'trainings' : 'achievements';
    await db.transaction(async (tx) => {
      const [d] = await tx.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      assert(d, 404, 'Bukti tidak ditemukan.');
      await getPeriod(tx, d.period_id, true);
      await tx.query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]);
      await calculateEmployee(tx, d.employee_id, d.period_id);
      await audit(tx, identity(res).id, 'EVIDENCE_DELETE', `evidence/${d.id}`);
    });
    res.json({ message: 'Bukti dihapus dan skor dihitung ulang.' });
  });
  return r;
}
