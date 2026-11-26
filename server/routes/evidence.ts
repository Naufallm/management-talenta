import { suggestTrainingMatch } from '../../shared/training-match.ts';
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
      if (req.body.evidence_id) {
        const kind = req.body.kind;
        assert(kind === 'training' || kind === 'achievement', 422, 'Jenis kegiatan tidak valid.');
        const table = kind === 'training' ? 'trainings' : 'achievements';
        const linked = await tx.query(
          `UPDATE ${table} SET document_id=$1,updated_at=now() WHERE id=$2 AND employee_id=$3 AND period_id=$4 AND document_id IS NULL AND (NOT verified OR $5) RETURNING id`,
          [id, req.body.evidence_id, employeeId, periodId, identity(res).role === 'ADMIN'],
        );
        assert(linked.length, 409, 'Kegiatan tidak tersedia untuk dilengkapi. Muat ulang data.');
        await audit(tx, identity(res).id, 'EVIDENCE_ATTACH', `evidence/${linked[0].id}`, {
          document_id: id,
        });
      }
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
        `INSERT INTO ${d.kind === 'training' ? 'trainings' : 'achievements'} (id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,document_id,verified,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          d.employee_id,
          periodId,
          d.name,
          d.activity_type,
          d.activity_date,
          d.organizer,
          d.kind === 'training' ? d.hours : 0,
          d.document_id,
          manager(res) && d.verified,
          identity(res).id,
        ],
      );
      if (d.kind === 'training') {
        const [person] = await tx.query('SELECT position FROM employees WHERE id=$1', [
          d.employee_id,
        ]);
        const verifying = manager(res) && d.verified;
        const match =
          d.job_match ?? (verifying ? suggestTrainingMatch(person.position, d.name) : null);
        assert(
          !verifying || match !== null,
          422,
          'Pilih kesesuaian sebelum memverifikasi pelatihan.',
        );
        await tx.query('UPDATE trainings SET place=$1,job_match=$2,updated_at=now() WHERE id=$3', [
          d.place,
          match,
          id,
        ]);
      } else
        await tx.query(
          'UPDATE achievements SET award_level=$1,award_scope=$2,updated_at=now() WHERE id=$3',
          [d.award_level, d.award_scope, id],
        );
      await calculateEmployee(tx, d.employee_id, periodId);
      await audit(tx, identity(res).id, 'EVIDENCE_CREATE', `evidence/${id}`);
    });
    res.status(201).json({ id, message: 'Bukti kompetensi disimpan.' });
  });
  r.patch('/evidence/training/:id/relevance', async (req, res) => {
    const match = req.body.job_match;
    assert(typeof match === 'boolean' || match === null, 422, 'Pilih kesesuaian pelatihan.');
    await db.transaction(async (tx) => {
      const [row] = await tx.query(
        'SELECT employee_id,period_id,verified FROM trainings WHERE id=$1 FOR UPDATE',
        [req.params.id],
      );
      assert(row, 404, 'Pelatihan tidak ditemukan.');
      await mayWrite(tx, res, row.employee_id, row.period_id);
      assert(
        identity(res).role === 'ADMIN' || (identity(res).role === 'PEGAWAI' && !row.verified),
        403,
        'Pelatihan terverifikasi hanya dapat dikoreksi Admin.',
      );
      await tx.query('UPDATE trainings SET job_match=$1,updated_at=now() WHERE id=$2', [
        match,
        req.params.id,
      ]);
      await audit(tx, identity(res).id, 'TRAINING_RELEVANCE', 'training/' + req.params.id, {
        job_match: match,
      });
    });
    res.json({ message: 'Kesesuaian pelatihan disimpan.' });
  });
  r.post(
    '/evidence/:periodId/training/:employeeId/verify-all',
    requireManager,
    async (req, res) => {
      const employeeId = String(req.params.employeeId);
      const periodId = String(req.params.periodId);
      const ids = req.body.ids;
      assert(
        Array.isArray(ids) && ids.length > 0 && ids.every((id) => typeof id === 'string'),
        422,
        'Pilih pelatihan yang akan diverifikasi.',
      );
      const count = await db.transaction(async (tx) => {
        await getPeriod(tx, periodId, true);
        const candidates = await tx.query(
          'SELECT t.id,t.name,t.job_match,e.position FROM trainings t JOIN employees e ON e.id=t.employee_id WHERE t.employee_id=$1 AND t.period_id=$2 AND t.id=ANY($3::text[]) AND NOT t.verified AND t.document_id IS NOT NULL ORDER BY t.id FOR UPDATE OF t',
          [employeeId, periodId, ids],
        );
        const changed: string[] = [];
        for (const row of candidates) {
          const match = row.job_match ?? suggestTrainingMatch(row.position, row.name);
          if (match == null) continue;
          await tx.query(
            'UPDATE trainings SET verified=true,job_match=$1,updated_at=now() WHERE id=$2',
            [match, row.id],
          );
          changed.push(row.id);
        }
        if (changed.length) {
          await calculateEmployee(tx, employeeId, periodId);
          await audit(tx, identity(res).id, 'TRAINING_VERIFY_ALL', 'employees/' + employeeId, {
            periodId,
            ids: changed,
          });
        }
        return changed.length;
      });
      res.json({ count });
    },
  );
  r.patch('/evidence/:kind/:id/verify', requireManager, async (req, res) => {
    assert(
      ['training', 'achievement'].includes(String(req.params.kind)),
      404,
      'Jenis bukti tidak dikenal.',
    );
    assert(typeof req.body.verified === 'boolean', 422, 'Status verifikasi tidak valid.');
    const table = req.params.kind === 'training' ? 'trainings' : 'achievements';
    await db.transaction(async (tx) => {
      const [d] = await tx.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [req.params.id]);
      assert(d, 404, 'Bukti tidak ditemukan.');
      await getPeriod(tx, d.period_id, true);
      assert(
        !req.body.verified || d.document_id,
        422,
        'Lampirkan dokumen sebelum memverifikasi kegiatan.',
      );
      if (table === 'trainings' && req.body.verified && d.job_match == null) {
        const [person] = await tx.query('SELECT position FROM employees WHERE id=$1', [
          d.employee_id,
        ]);
        const match = suggestTrainingMatch(person.position, d.name);
        assert(match !== null, 422, 'Pilih kesesuaian sebelum memverifikasi pelatihan.');
        await tx.query('UPDATE trainings SET job_match=$1 WHERE id=$2', [match, d.id]);
      }
      await tx.query(`UPDATE ${table} SET verified=$1,updated_at=now() WHERE id=$2`, [
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
      const [d] = await tx.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`, [req.params.id]);
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
