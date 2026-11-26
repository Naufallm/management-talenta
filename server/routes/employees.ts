import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
import { employeeSchema, educationSchema } from '../../shared/contracts.ts';
import { assert } from '../errors.ts';
import { audit, requireManager, requireSuper, ownEmployee, identity, pageParams } from '../http.ts';
import { token, hashPassword } from '../security.ts';
import { testingLoginEnabled, testingPassword } from '../testing-policy.ts';
import sharp from 'sharp';
import { upload } from './evidence.ts';
const teamSchema = z.object({ name: z.string().trim().min(2).max(100) });
const profileSchema = employeeSchema.pick({ name: true, email: true, phone: true }).strict();
const profileFields = `e.*,EXISTS(SELECT 1 FROM users WHERE employee_id=e.id) AS has_account,(SELECT version FROM employee_photos WHERE employee_id=e.id) AS photo_version,
 EXISTS(SELECT 1 FROM team_members tm WHERE tm.employee_id=e.id AND tm.is_leader AND tm.year=$1) AS is_leader`;
export function employeeRouter(db: DB) {
  const r = Router();
  r.get('/employees', requireManager, async (req, res) => {
    const { page, limit } = pageParams(req),
      q = String(req.query.q || '').slice(0, 120),
      unit = String(req.query.unit || ''),
      status = z.enum(['active', 'inactive', 'all']).parse(req.query.status || 'active'),
      year = z.coerce
        .number()
        .int()
        .min(2020)
        .max(2100)
        .parse(req.query.year || new Date().getFullYear());
    const condition = `($1='' OR concat_ws(' ',e.name,e.nip,e.position,e.unit) ILIKE '%' || $1 || '%') AND ($2='' OR e.unit=$2) AND ($3='all' OR e.active=($3='active'))`;
    const [count] = await db.query(
      `SELECT count(*)::int AS total FROM employees e WHERE ${condition}`,
      [q, unit, status],
    );
    const rows = await db.query(
      `SELECT e.*,(SELECT version FROM employee_photos WHERE employee_id=e.id) AS photo_version,EXISTS(SELECT 1 FROM team_members tm WHERE tm.employee_id=e.id AND tm.is_leader AND tm.year=$6) AS is_leader,COALESCE((SELECT string_agg(DISTINCT t.name,', ') FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.employee_id=e.id AND tm.year=$6),'') AS teams FROM employees e WHERE ${condition} ORDER BY e.name,e.id LIMIT $4 OFFSET $5`,
      [q, unit, status, limit, (page - 1) * limit, year],
    );
    const units = await db.query('SELECT DISTINCT unit FROM employees ORDER BY unit');
    res.json({ rows, total: count.total, page, limit, units: units.map((u) => u.unit) });
  });
  r.get('/employees/:id/feedback', async (req, res) => {
    ownEmployee(res, String(req.params.id));
    res.json(
      await db.query(
        `SELECT f.*,u.username AS author_name FROM employee_feedback f JOIN users u ON u.id=f.author_id WHERE f.employee_id=$1 ORDER BY f.created_at DESC,f.id DESC`,
        [req.params.id],
      ),
    );
  });
  r.post('/employees/:id/feedback', requireManager, async (req, res) => {
    const { content } = z.object({ content: z.string().trim().min(3).max(4000) }).parse(req.body);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      assert(
        (await tx.query('SELECT id FROM employees WHERE id=$1 AND active', [req.params.id])).length,
        404,
        'Pegawai aktif tidak ditemukan.',
      );
      await tx.query(
        'INSERT INTO employee_feedback(id,employee_id,author_id,content) VALUES($1,$2,$3,$4)',
        [id, req.params.id, identity(res).id, content],
      );
      await audit(
        tx,
        identity(res).id,
        'FEEDBACK_CREATE',
        `employees/${req.params.id}/feedback/${id}`,
      );
    });
    res.status(201).json({ id });
  });
  r.post('/employees', requireManager, async (req, res) => {
    const d = employeeSchema.parse(req.body),
      id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query(
        'INSERT INTO employees(id,nip,name,position,grade,unit,email,phone,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [id, d.nip, d.name, d.position, d.grade, d.unit, d.email, d.phone, d.active],
      );
      await audit(tx, identity(res).id, 'EMPLOYEE_CREATE', `employees/${id}`);
    });
    res.status(201).json({ id, message: 'Pegawai berhasil ditambahkan.' });
  });
  r.get('/employees/:id', async (req, res) => {
    const id = String(req.params.id);
    ownEmployee(res, id);
    const year = z.coerce
      .number()
      .int()
      .min(2020)
      .max(2100)
      .parse(req.query.year || new Date().getFullYear());
    const [employee] = await db.query(`SELECT ${profileFields} FROM employees e WHERE e.id=$2`, [
      year,
      id,
    ]);
    assert(employee, 404, 'Pegawai tidak ditemukan.');
    const teams = await db.query(
      'SELECT tm.*,t.name FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.employee_id=$1 ORDER BY year DESC,t.name',
      [id],
    );
    // Deliberately enumerate nonpsychological sources; never join psych tables here.
    const potential = await db.query(
      'SELECT s.*,p.year FROM potential_scores s JOIN periods p ON p.id=s.period_id WHERE employee_id=$1 ORDER BY p.year DESC',
      [id],
    );
    const competency = await db.query(
      'SELECT s.*,p.year FROM competency_scores s JOIN periods p ON p.id=s.period_id WHERE employee_id=$1 ORDER BY p.year DESC',
      [id],
    );
    const ckp = await db.query(
      'SELECT month,year,score FROM ckp_scores WHERE employee_id=$1 ORDER BY year DESC,month',
      [id],
    );
    const history = await db.query(
      'SELECT q.*,p.year FROM quadrant_results q JOIN periods p ON p.id=q.period_id WHERE employee_id=$1 ORDER BY year DESC',
      [id],
    );
    const evidence = await db.query(
      `SELECT id,name,activity_type,activity_date,organizer,hours,verified,document_id,period_id,place,updated_at,job_match,NULL::text AS award_level,NULL::text AS award_scope,'training' AS kind FROM trainings WHERE employee_id=$1 UNION ALL SELECT id,name,activity_type,activity_date,organizer,hours,verified,document_id,period_id,'' AS place,updated_at,NULL::boolean,award_level,award_scope,'achievement' FROM achievements WHERE employee_id=$1 ORDER BY activity_date DESC`,
      [id],
    );
    res.json({ employee, teams, potential, competency, ckp, history, evidence });
  });
  r.get('/employees/:id/education', async (req, res) => {
    ownEmployee(res, String(req.params.id));
    res.json(
      await db.query(
        'SELECT * FROM formal_education WHERE employee_id=$1 ORDER BY diploma_date DESC,id',
        [req.params.id],
      ),
    );
  });
  r.post('/employees/:id/education', async (req, res) => {
    const employeeId = String(req.params.id),
      d = educationSchema.parse(req.body),
      id = randomUUID();
    await mayEditProfile(res, employeeId);
    await db.transaction(async (tx) => {
      assert(
        (await tx.query('SELECT id FROM employees WHERE id=$1 AND active FOR UPDATE', [employeeId]))
          .length,
        404,
        'Pegawai aktif tidak ditemukan.',
      );
      await tx.query(
        'INSERT INTO formal_education(id,employee_id,level,study_program,diploma_date) VALUES($1,$2,$3,$4,$5)',
        [id, employeeId, d.level, d.study_program, d.diploma_date],
      );
      await audit(
        tx,
        identity(res).id,
        'EDUCATION_CREATE',
        `employees/${employeeId}/education/${id}`,
      );
    });
    res.status(201).json({ id });
  });
  r.put('/employees/:id/education/:educationId', async (req, res) => {
    const employeeId = String(req.params.id),
      d = educationSchema.parse(req.body);
    await mayEditProfile(res, employeeId);
    await db.transaction(async (tx) => {
      assert(
        (await tx.query('SELECT id FROM employees WHERE id=$1 AND active FOR UPDATE', [employeeId]))
          .length,
        404,
        'Pegawai aktif tidak ditemukan.',
      );
      const rows = await tx.query(
        'UPDATE formal_education SET level=$1,study_program=$2,diploma_date=$3,updated_at=now() WHERE id=$4 AND employee_id=$5 RETURNING id',
        [d.level, d.study_program, d.diploma_date, req.params.educationId, employeeId],
      );
      assert(rows.length, 404, 'Pendidikan tidak ditemukan.');
      await audit(
        tx,
        identity(res).id,
        'EDUCATION_UPDATE',
        `employees/${employeeId}/education/${req.params.educationId}`,
      );
    });
    res.json({ message: 'Pendidikan diperbarui.' });
  });
  r.delete('/employees/:id/education/:educationId', async (req, res) => {
    const employeeId = String(req.params.id);
    await mayEditProfile(res, employeeId);
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'DELETE FROM formal_education WHERE id=$1 AND employee_id=$2 RETURNING id',
        [req.params.educationId, employeeId],
      );
      assert(rows.length, 404, 'Pendidikan tidak ditemukan.');
      await audit(
        tx,
        identity(res).id,
        'EDUCATION_DELETE',
        `employees/${employeeId}/education/${req.params.educationId}`,
      );
    });
    res.json({ message: 'Pendidikan dihapus.' });
  });
  r.put('/employees/:id', requireManager, async (req, res) => {
    const d = employeeSchema.parse(req.body),
      id = String(req.params.id);
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'UPDATE employees SET nip=$1,name=$2,position=$3,grade=$4,unit=$5,email=$6,phone=$7,active=$8,updated_at=now() WHERE id=$9 RETURNING id',
        [d.nip, d.name, d.position, d.grade, d.unit, d.email, d.phone, d.active, id],
      );
      assert(rows.length, 404, 'Pegawai tidak ditemukan.');
      // Contact and employment edits must not silently change the login ID.
      if (!d.active)
        await tx.query(
          'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE employee_id=$1)',
          [id],
        );
      await audit(tx, identity(res).id, 'EMPLOYEE_UPDATE', `employees/${id}`);
    });
    res.json({ message: 'Data pegawai diperbarui.' });
  });
  r.delete('/employees/:id', requireManager, async (req, res) => {
    const id = String(req.params.id);
    assert(identity(res).employee_id !== id, 400, 'Akun sendiri tidak dapat dinonaktifkan.');
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'UPDATE employees SET active=false,updated_at=now() WHERE id=$1 RETURNING id',
        [id],
      );
      assert(rows.length, 404, 'Pegawai tidak ditemukan.');
      await tx.query(
        'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE employee_id=$1)',
        [id],
      );
      await audit(tx, identity(res).id, 'EMPLOYEE_DEACTIVATE', `employees/${id}`);
    });
    res.json({ message: 'Pegawai diarsipkan. Seluruh riwayat tetap tersimpan.' });
  });
  r.post('/employees/:id/restore', requireSuper, async (req, res) => {
    const id = String(req.params.id);
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'UPDATE employees SET active=true,updated_at=now() WHERE id=$1 RETURNING id',
        [id],
      );
      assert(rows.length, 404, 'Pegawai tidak ditemukan.');
      await audit(tx, identity(res).id, 'EMPLOYEE_RESTORE', `employees/${id}`);
    });
    res.json({ message: 'Pegawai dipulihkan dari arsip.' });
  });
  async function mayEditProfile(res: any, id: string) {
    assert(
      identity(res).role === 'ADMIN' || identity(res).employee_id === id,
      403,
      'Anda hanya dapat mengubah profil sendiri.',
    );
  }
  r.patch('/employees/:id/profile', async (req, res) => {
    const id = String(req.params.id);
    await mayEditProfile(res, id);
    const d = profileSchema.parse(req.body);
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'UPDATE employees SET name=$1,email=$2,phone=$3,updated_at=now() WHERE id=$4 AND active RETURNING id',
        [d.name, d.email, d.phone, id],
      );
      assert(rows.length, 404, 'Pegawai tidak ditemukan.');
      await audit(tx, identity(res).id, 'EMPLOYEE_PROFILE_UPDATE', `employees/${id}`);
    });
    res.json({ message: 'Profil diperbarui. ID login tetap sama.' });
  });
  r.get('/employees/:id/photo', async (req, res) => {
    ownEmployee(res, String(req.params.id));
    const [photo] = await db.query('SELECT contents FROM employee_photos WHERE employee_id=$1', [
      req.params.id,
    ]);
    assert(photo, 404, 'Foto tidak tersedia.');
    res
      .set({
        'Content-Type': 'image/jpeg',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      })
      .send(Buffer.from(photo.contents));
  });
  r.post(
    '/employees/:id/photo',
    async (req, res, next) => {
      await mayEditProfile(res, String(req.params.id));
      next();
    },
    upload.single('file'),
    async (req, res) => {
      const id = String(req.params.id),
        file = req.file;
      assert(file, 422, 'Pilih foto JPEG atau PNG, maksimal 2 MB.');
      let contents: Buffer;
      assert(
        file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
          (file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255),
        422,
        'Foto harus JPEG atau PNG.',
      );
      try {
        const image = sharp(file.buffer, { limitInputPixels: 16_000_000, failOn: 'error' });
        const metadata = await image.metadata();
        assert(['png', 'jpeg'].includes(metadata.format || ''), 422, 'Foto harus JPEG atau PNG.');
        contents = await image
          .rotate()
          .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch {
        assert(
          false,
          422,
          'Foto tidak dapat dibaca. Gunakan JPEG atau PNG maksimal 2 MB dan 16 megapiksel.',
        );
      }
      const version = randomUUID();
      await db.transaction(async (tx) => {
        assert(
          (await tx.query('SELECT id FROM employees WHERE id=$1 AND active FOR UPDATE', [id]))
            .length,
          404,
          'Pegawai tidak ditemukan.',
        );
        await tx.query(
          'INSERT INTO employee_photos(employee_id,contents,version) VALUES($1,$2,$3) ON CONFLICT(employee_id) DO UPDATE SET contents=$2,version=$3,updated_at=now()',
          [id, contents, version],
        );
        await audit(tx, identity(res).id, 'EMPLOYEE_PHOTO_UPDATE', `employees/${id}/photo`);
      });
      res.json({ message: 'Foto diperbarui.', version });
    },
  );
  r.delete('/employees/:id/photo', async (req, res) => {
    const id = String(req.params.id);
    await mayEditProfile(res, id);
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM employee_photos WHERE employee_id=$1', [id]);
      await audit(tx, identity(res).id, 'EMPLOYEE_PHOTO_DELETE', `employees/${id}/photo`);
    });
    res.json({ message: 'Foto dihapus.' });
  });
  r.post('/employees/:id/account', requireManager, async (req, res) => {
    const id = String(req.params.id),
      [employee] = await db.query('SELECT * FROM employees WHERE id=$1 AND active', [id]);
    assert(employee, 404, 'Pegawai aktif tidak ditemukan.');
    const mustChangePassword = !testingLoginEnabled();
    const password = testingLoginEnabled() ? testingPassword : token().slice(0, 20) + '!a1',
      hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      assert(
        !(await tx.query('SELECT id FROM users WHERE employee_id=$1', [id])).length,
        409,
        'Pegawai sudah memiliki akun. Reset kata sandi melalui Admin.',
      );
      await tx.query(
        `INSERT INTO users(id,username,password_hash,role,employee_id,must_change_password) VALUES($1,$2,$3,'PEGAWAI',$4,$5)`,
        [randomUUID(), employee.email || employee.nip, hash, id, mustChangePassword],
      );
      await audit(tx, identity(res).id, 'EMPLOYEE_ACCOUNT_CREATE', `employees/${id}`);
    });
    res.status(201).json({
      username: employee.email || employee.nip,
      temporaryPassword: password,
      mustChangePassword,
    });
  });
  r.get('/teams', requireManager, async (req, res) => {
    const year = z.coerce
      .number()
      .int()
      .min(2020)
      .max(2100)
      .parse(req.query.year || 2026);
    const teams = await db.query('SELECT * FROM teams ORDER BY name');
    const members = await db.query(
      'SELECT tm.*,e.name,e.position,e.active FROM team_members tm JOIN employees e ON e.id=tm.employee_id WHERE tm.year=$1 ORDER BY tM.is_leader DESC,e.name',
      [year],
    );
    res.json({ teams, members });
  });
  r.post('/teams', requireManager, async (req, res) => {
    const { name } = teamSchema.parse(req.body),
      id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO teams VALUES($1,$2)', [id, name]);
      await audit(tx, identity(res).id, 'TEAM_CREATE', `teams/${id}`);
    });
    res.status(201).json({ id });
  });
  r.put('/teams/:id', requireSuper, async (req, res) => {
    const { name } = teamSchema.parse(req.body);
    const id = String(req.params.id);
    await db.transaction(async (tx) => {
      const [team] = await tx.query('SELECT name FROM teams WHERE id=$1 FOR UPDATE', [id]);
      assert(team, 404, 'Tim tidak ditemukan.');
      assert(
        !(await tx.query('SELECT id FROM teams WHERE name=$1 AND id<>$2', [name, id])).length,
        409,
        'Nama tim sudah digunakan.',
      );
      await tx.query('UPDATE teams SET name=$1 WHERE id=$2', [name, id]);
      await audit(tx, identity(res).id, 'TEAM_UPDATE', `teams/${id}`, {
        previous_name: team.name,
        name,
      });
    });
    res.json({ message: 'Nama tim diperbarui.' });
  });
  r.delete('/teams/:id', requireSuper, async (req, res) => {
    const id = String(req.params.id);
    await db.transaction(async (tx) => {
      const [team] = await tx.query('SELECT name FROM teams WHERE id=$1 FOR UPDATE', [id]);
      assert(team, 404, 'Tim tidak ditemukan.');
      assert(
        !(await tx.query('SELECT id FROM team_members WHERE team_id=$1 LIMIT 1', [id])).length,
        409,
        'Tim masih memiliki penugasan. Hapus penugasan terlebih dahulu. Penugasan pada tahun yang terkunci tetap dipertahankan.',
      );
      await tx.query('DELETE FROM teams WHERE id=$1', [id]);
      await audit(tx, identity(res).id, 'TEAM_DELETE', `teams/${id}`, { name: team.name });
    });
    res.json({ message: 'Tim dihapus.' });
  });
  r.put('/teams/:id/members', requireManager, async (req, res) => {
    const d = z
      .object({
        year: z.number().int().min(2020).max(2100),
        employee_id: z.string(),
        is_leader: z.boolean(),
        remove: z.boolean().default(false),
      })
      .parse(req.body);
    await db.transaction(async (tx) => {
      const [period] = await tx.query('SELECT status FROM periods WHERE year=$1 FOR UPDATE', [d.year]);
      assert(period?.status !== 'CLOSED', 409, 'Buka kembali periode sebelum mengubah penugasan tim.');
      const teams = await tx.query('SELECT id FROM teams WHERE id=$1 FOR UPDATE', [req.params.id]);
      assert(teams.length, 404, 'Tim tidak ditemukan.');
      assert(
        !(
          await tx.query(
            'SELECT a.id FROM leader_assessments a JOIN periods p ON p.id=a.period_id WHERE p.year=$1 AND a.submitted_at IS NOT NULL LIMIT 1',
            [d.year],
          )
        ).length,
        409,
        'Struktur tim tahun ini terkunci karena penilaian Ketua Tim sudah dikirim.',
      );
      assert(
        (await tx.query('SELECT id FROM employees WHERE id=$1 AND active', [d.employee_id])).length,
        422,
        'Pilih pegawai aktif.',
      );
      if (d.remove)
        await tx.query('DELETE FROM team_members WHERE team_id=$1 AND employee_id=$2 AND year=$3', [
          req.params.id,
          d.employee_id,
          d.year,
        ]);
      else {
        if (d.is_leader)
          await tx.query('UPDATE team_members SET is_leader=false WHERE team_id=$1 AND year=$2', [
            req.params.id,
            d.year,
          ]);
        await tx.query(
          'INSERT INTO team_members VALUES($1,$2,$3,$4,$5) ON CONFLICT(team_id,employee_id,year) DO UPDATE SET is_leader=$5',
          [randomUUID(), req.params.id, d.employee_id, d.year, d.is_leader],
        );
      }
      await audit(tx, identity(res).id, 'TEAM_ASSIGNMENT', `teams/${req.params.id}`, {
        year: d.year,
        employeeId: d.employee_id,
      });
    });
    res.json({ message: 'Penugasan tim diperbarui.' });
  });
  return r;
}
