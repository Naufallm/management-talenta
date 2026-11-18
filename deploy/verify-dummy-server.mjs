/* global console, fetch, AbortSignal */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import pg from 'pg';
import { postgresSchemaConfig } from '../server/db/schema.ts';

const base = '/home/bps/talenta-deploy-20261112';
const env = parse(await readFile(`${base}/app/deploy/state/app.env`));
const bootstrap = parse(await readFile(`${base}/admin-first-login.env`));
const db = new pg.Client({
  connectionString: postgresSchemaConfig(env.DATABASE_URL, 'management_talenta').connectionString,
});
await db.connect();
let periodId;
try {
  const [p] = (
    await db.query(
      'SELECT p.* FROM periods p JOIN demo_data_batches b ON b.period_id=p.id WHERE p.demo_data ORDER BY p.year DESC',
    )
  ).rows;
  assert.ok(p, 'Batch dummy belum aktif');
  periodId = p.id;
  const active = (await db.query('SELECT count(*)::int AS n FROM employees WHERE active')).rows[0]
    .n;
  assert.equal(active, 24);
  const points = (
    await db.query(
      'SELECT q.* FROM quadrant_results q JOIN employees e ON e.id=q.employee_id WHERE q.period_id=$1 AND e.active',
      [p.id],
    )
  ).rows;
  assert.equal(points.length, 24);
  assert.equal(new Set(points.map((q) => `${q.potential}/${q.competency}`)).size, 24);
  assert.ok(
    points.every((q) => q.potential >= 80 && q.competency >= 80 && q.quadrant === 'Talenta Unggul'),
  );
  for (const table of [
    'trainings',
    'achievements',
    'leader_assessments',
    'potential_dna_assessments',
  ])
    assert.equal(
      (await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE period_id=$1`, [p.id])).rows[0]
        .n,
      24,
      table,
    );
  assert.equal(
    (await db.query('SELECT count(*)::int AS n FROM team_members WHERE year=$1', [p.year])).rows[0]
      .n,
    28,
  );
  assert.equal(
    (await db.query("SELECT active FROM employees WHERE nip='196808161988031002'")).rows[0].active,
    false,
  );
  console.log(
    'PASS database: 24 active employees, all demo sources complete, 28 memberships, 24 unique high quadrants, retired employee remains archived',
  );
} finally {
  await db.end();
}
for (const origin of ['http://127.0.0.1:5015', env.APP_ORIGIN]) {
  assert.equal(
    (await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(20000) })).status,
    200,
  );
  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: env.APP_ORIGIN },
    body: JSON.stringify({
      username: bootstrap.BOOTSTRAP_USERNAME,
      password: bootstrap.BOOTSTRAP_PASSWORD,
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.getSetCookie().find((v) => v.startsWith('talenta_session='));
  assert.ok(cookie);
  const headers = {
    Cookie: cookie.split(';')[0],
    'X-CSRF-Token': (await login.json()).csrfToken,
    Origin: env.APP_ORIGIN,
  };
  const points = await (await fetch(`${origin}/api/talent/${periodId}`, { headers })).json();
  assert.equal(points.length, 24);
  const periods = await (await fetch(`${origin}/api/periods`, { headers })).json();
  assert.equal(periods.find((p) => p.id === periodId).demo_data, true);
  assert.equal((await fetch(`${origin}/api/auth/logout`, { method: 'POST', headers })).status, 200);
  console.log(
    `PASS ${origin}: health, existing Admin login, all 24 quadrants, demo flag and logout`,
  );
}
console.log('DEMO_PRODUCTION_PASS');
