/* global console, fetch, AbortSignal */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import pg from 'pg';
import { postgresSchemaConfig } from '../server/db/schema.ts';

const base = '/home/bps/talenta-deploy-20261112';
const env = parse(await readFile(`${base}/app/deploy/state/app.env`));
const bootstrap = parse(await readFile(`${base}/admin-first-login.env`));
const config = postgresSchemaConfig(env.DATABASE_URL, env.DB_SCHEMA);
const db = new pg.Client({ connectionString: config.connectionString });
await db.connect();
try {
  const current = (
    await db.query('SELECT current_database() AS database, current_schema() AS schema')
  ).rows[0];
  assert.equal(current.database, 'db_magang');
  assert.equal(current.schema, 'management_talenta');
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count,
    7,
  );
  const role = (
    await db.query(
      'SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user',
    )
  ).rows[0];
  assert.deepEqual(role, { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
  console.log('PASS PostgreSQL: db_magang, management_talenta, 7 migrations, restricted app role');
} finally {
  await db.end();
}
for (const origin of ['http://127.0.0.1:5015', env.APP_ORIGIN]) {
  const health = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(20000) });
  assert.equal(health.status, 200, `health ${origin}`);
  const options = await (await fetch(`${origin}/api/auth/options`)).json();
  assert.equal(options.testingLogin, false);
  assert.deepEqual(options.accounts, []);
  const denied = await fetch(`${origin}/api/employees`);
  assert.equal(denied.status, 401);
  const headers = { 'Content-Type': 'application/json', Origin: env.APP_ORIGIN };
  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: bootstrap.BOOTSTRAP_USERNAME,
      password: bootstrap.BOOTSTRAP_PASSWORD,
    }),
  });
  assert.equal(login.status, 200, `login ${origin}`);
  const cookie = login.headers.getSetCookie().find((value) => value.startsWith('talenta_session='));
  assert.ok(cookie && /;\s*Secure/i.test(cookie) && /;\s*HttpOnly/i.test(cookie));
  const sessionHeaders = {
    ...headers,
    Cookie: cookie.split(';')[0],
    'X-CSRF-Token': (await login.json()).csrfToken,
  };
  const me = await (await fetch(`${origin}/api/auth/me`, { headers: sessionHeaders })).json();
  assert.equal(me.role, 'ADMIN');
  assert.equal(me.must_change_password, false);
  const logout = await fetch(`${origin}/api/auth/logout`, {
    method: 'POST',
    headers: sessionHeaders,
  });
  assert.equal(logout.status, 200);
  const page = await fetch(`${origin}/login`);
  assert.equal(page.status, 200);
  assert.ok(page.headers.get('content-security-policy'));
  const html = await page.text();
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
    const asset = await fetch(`${origin}${match[1]}`);
    assert.equal(asset.status, 200, `asset ${match[1]}`);
  }
  console.log(`PASS ${origin}: health, login, secure session, logout, access control, assets`);
}
console.log('PRODUCTION_SMOKE_PASS');
