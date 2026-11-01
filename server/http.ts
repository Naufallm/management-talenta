import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { DB } from './db/index.ts';
import { assert } from './errors.ts';
import { digest, token } from './security.ts';
import { production, origin } from './config.ts';
import type { Role } from '../shared/contracts.ts';
import { testingLoginEnabled } from './testing-policy.ts';
export interface Identity {
  id: string;
  username: string;
  role: Role;
  employee_id: string | null;
  name: string;
  must_change_password: boolean;
  is_leader: boolean;
}
export const identity = (res: Response) => res.locals.user as Identity;
export const manager = (res: Response) => identity(res).role !== 'PEGAWAI';
export function requireManager(_req: Request, res: Response, next: NextFunction) {
  assert(manager(res), 403, 'Akses hanya untuk Admin.');
  next();
}
export function requireSuper(_req: Request, res: Response, next: NextFunction) {
  assert(identity(res).role === 'ADMIN', 403, 'Akses hanya untuk Admin.');
  next();
}
export function ownEmployee(res: Response, id: string) {
  assert(
    manager(res) || identity(res).employee_id === id,
    403,
    'Anda hanya dapat mengakses data sendiri.',
  );
}
export const audit = async (
  db: DB,
  actor: string | null,
  action: string,
  resource: string,
  metadata: unknown = {},
) => {
  await db.query(
    'INSERT INTO audit_logs(id,actor_id,action,resource,metadata) VALUES($1,$2,$3,$4,$5)',
    [randomUUID(), actor, action, resource, JSON.stringify(metadata)],
  );
};
export const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
};
export async function session(db: DB, userId: string, res: Response) {
  const value = token(),
    csrf = token();
  await db.query('DELETE FROM sessions WHERE expires_at<now()');
  await db.query(
    `INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')`,
    [digest(value), userId, csrf],
  );
  res.cookie('talenta_session', value, cookieOptions);
  return csrf;
}
export function authenticate(db: DB) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const value = req.cookies?.talenta_session;
    assert(typeof value === 'string', 401, 'Silakan masuk terlebih dahulu.');
    const [user] = await db.query(
      `SELECT u.id,u.username,u.role,u.employee_id,u.must_change_password,COALESCE(e.name,u.username) AS name,s.csrf_token,
 EXISTS(SELECT 1 FROM team_members tm JOIN periods p ON tm.year=p.year WHERE tm.employee_id=u.employee_id AND tm.is_leader AND p.status='OPEN') AS is_leader
 FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN employees e ON e.id=u.employee_id
 WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active AND (e.id IS NULL OR e.active)`,
      [digest(value)],
    );
    assert(user, 401, 'Sesi berakhir. Silakan masuk kembali.');
    if (testingLoginEnabled()) user.must_change_password = false;
    res.locals.user = user;
    res.locals.csrf = user.csrf_token;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      assert(
        req.get('X-CSRF-Token') === user.csrf_token,
        403,
        'Token keamanan tidak valid. Muat ulang halaman.',
      );
      const requestOrigin = req.get('Origin');
      assert(!requestOrigin || requestOrigin === origin, 403, 'Asal permintaan tidak diizinkan.');
    }
    assert(
      !user.must_change_password ||
        ['/auth/me', '/auth/password', '/auth/logout'].includes(req.path),
      403,
      'Ganti kata sandi awal sebelum melanjutkan.',
    );
    if (user.role === 'SUPERVISOR' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      assert(
        ['/auth/password', '/auth/logout'].includes(req.path) ||
          (req.method === 'POST' && /^\/employees\/[^/]+\/feedback$/.test(req.path)),
        403,
        'Supervisor hanya dapat melihat data dan memberikan feedback.',
      );
    }
    next();
  };
}
export const pageParams = (req: Request) => ({
  page: Math.trunc(Math.max(1, Math.min(100000, Number(req.query.page) || 1))),
  limit: Math.trunc(Math.max(1, Math.min(100, Number(req.query.limit) || 10))),
});
export async function getPeriod(db: DB, id: string, write = false, lock = false) {
  const [period] = await db.query(
    `SELECT * FROM periods WHERE id=$1${write || lock ? ' FOR UPDATE' : ''}`,
    [id],
  );
  assert(period, 404, 'Periode tidak ditemukan.');
  if (write) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const date = (v: any) =>
      v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
    assert(
      period.status === 'OPEN' && today >= date(period.starts_on) && today <= date(period.ends_on),
      409,
      'Periode penilaian tidak terbuka pada tanggal ini.',
    );
  }
  return period;
}
