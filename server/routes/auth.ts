import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { DB } from '../db/index.ts';
import { hashPassword, verifyPassword, digest, token } from '../security.ts';
import { assert } from '../errors.ts';
import { audit, identity, session, cookieOptions, requireSuper } from '../http.ts';
import { origin } from '../config.ts';
import { testingLoginEnabled, testingAccounts, testingPassword } from '../testing-policy.ts';
export function loginRouter(db: DB) {
  const r = Router();
  r.get('/auth/options', async (_req, res) => {
    if (!testingLoginEnabled()) {
      res.json({ testingLogin: false, accounts: [] });
      return;
    }
    const accounts = await db.query(
      `SELECT u.username,u.role,COALESCE(e.name,u.username) AS name FROM users u LEFT JOIN employees e ON e.id=u.employee_id WHERE u.active AND (e.id IS NULL OR e.active) AND (u.username IN ($1,$2) OR u.role='PEGAWAI') ORDER BY CASE u.role WHEN 'ADMIN' THEN 0 WHEN 'SUPERVISOR' THEN 1 ELSE 2 END,e.name,u.username`,
      testingAccounts.map((a) => a.username),
    );
    res.json({ testingLogin: true, password: testingPassword, accounts });
  });
  r.post(
    '/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
    }),
    async (req, res) => {
      assert(
        !req.get('Origin') || req.get('Origin') === origin,
        403,
        'Asal permintaan tidak diizinkan.',
      );
      const data = z
        .object({
          username: z.string().trim().min(1).max(100),
          password: z.string().min(1).max(128),
        })
        .parse(req.body);
      const [user] = await db.query(
        'SELECT u.* FROM users u LEFT JOIN employees e ON e.id=u.employee_id WHERE u.username=$1 AND u.active AND (e.id IS NULL OR e.active)',
        [data.username],
      );
      const valid = await verifyPassword(data.password, user?.password_hash || 'scrypt:missing:00');
      if (!user || !valid) {
        await audit(db, null, 'LOGIN_FAILED', 'auth');
        assert(false, 401, 'NIP/akun atau kata sandi tidak sesuai.');
      }
      const csrfToken = await session(db, user.id, res);
      await audit(db, user.id, 'LOGIN', 'auth');
      res.json({ csrfToken });
    },
  );
  return r;
}
export function authRouter(db: DB) {
  const r = Router();
  r.get('/auth/me', (_req, res) => {
    const user = { ...res.locals.user };
    delete user.csrf_token;
    res.json({ ...user, csrfToken: res.locals.csrf });
  });
  r.post('/auth/logout', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [
      digest(req.cookies.talenta_session),
    ]);
    res.clearCookie('talenta_session', cookieOptions);
    res.json({ message: 'Anda telah keluar.' });
  });
  r.post('/auth/password', async (req, res) => {
    const data = z
      .object({
        currentPassword: z.string().min(1).max(128),
        password: z.string().min(12, 'Gunakan minimal 12 karakter.').max(128),
      })
      .parse(req.body);
    const user = identity(res);
    const [stored] = await db.query('SELECT password_hash FROM users WHERE id=$1', [user.id]);
    assert(
      await verifyPassword(data.currentPassword, stored.password_hash),
      400,
      'Kata sandi lama tidak sesuai.',
    );
    assert(data.currentPassword !== data.password, 400, 'Gunakan kata sandi yang berbeda.');
    const hash = await hashPassword(data.password);
    await db.transaction(async (tx) => {
      await tx.query('UPDATE users SET password_hash=$1,must_change_password=false WHERE id=$2', [
        hash,
        user.id,
      ]);
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [user.id]);
      await audit(tx, user.id, 'PASSWORD_CHANGE', `users/${user.id}`);
    });
    const csrfToken = await session(db, user.id, res);
    res.json({ message: 'Kata sandi diperbarui.', csrfToken });
  });
  r.get('/users', requireSuper, async (_req, res) =>
    res.json(
      await db.query(
        'SELECT u.id,u.username,u.role,u.employee_id,u.active,u.must_change_password,e.name FROM users u LEFT JOIN employees e ON e.id=u.employee_id ORDER BY u.username',
      ),
    ),
  );
  r.patch('/users/:id', requireSuper, async (req, res) => {
    const { role, active } = z
      .object({ role: z.enum(['ADMIN', 'SUPERVISOR', 'PEGAWAI']), active: z.boolean() })
      .parse(req.body);
    assert(
      req.params.id !== identity(res).id,
      400,
      'Peran dan status akun sendiri tidak dapat diubah.',
    );
    const [user] = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    assert(user, 404, 'Pengguna tidak ditemukan.');
    assert(role !== 'PEGAWAI' || user.employee_id, 422, 'Peran Pegawai memerlukan profil pegawai.');
    await db.transaction(async (tx) => {
      await tx.query('UPDATE users SET role=$1,active=$2 WHERE id=$3', [
        role,
        active,
        req.params.id,
      ]);
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [req.params.id]);
      await audit(tx, identity(res).id, 'USER_UPDATE', `users/${req.params.id}`);
    });
    res.json({ message: 'Akses pengguna diperbarui.' });
  });
  r.post('/users/:id/reset-password', requireSuper, async (req, res) => {
    assert(
      req.params.id !== identity(res).id,
      400,
      'Gunakan menu ganti kata sandi untuk akun sendiri.',
    );
    const mustChangePassword = !testingLoginEnabled();
    const password = testingLoginEnabled() ? testingPassword : token().slice(0, 20) + '!a1',
      hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const rows = await tx.query(
        'UPDATE users SET password_hash=$1,must_change_password=$3 WHERE id=$2 RETURNING id',
        [hash, req.params.id, mustChangePassword],
      );
      assert(rows.length, 404, 'Pengguna tidak ditemukan.');
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [req.params.id]);
      await audit(tx, identity(res).id, 'PASSWORD_RESET', `users/${req.params.id}`);
    });
    res.json({ temporaryPassword: password, mustChangePassword });
  });
  return r;
}
