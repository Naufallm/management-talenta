import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { connectDb, migrate, type DB } from '../server/db/index.ts';
import { seed } from '../server/db/seed.ts';
import { createApp } from '../server/app.ts';
import { prepareTestingAccounts } from '../server/testing-auth.ts';
import { testingLoginEnabled } from '../server/testing-policy.ts';
import { hashPassword, verifyPassword } from '../server/security.ts';

process.env.NODE_ENV = 'test';
process.env.TEST_LOGIN_ENABLED = 'true';
process.env.PGLITE_DIR = 'memory://';
delete process.env.DATABASE_URL;
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);
let db: DB, app: ReturnType<typeof createApp>;
before(async () => {
  db = await connectDb();
  await migrate(db);
  await seed(db);
  app = createApp(db);
});
after(async () => {
  await db.close();
});

test('testing seed creates email accounts and resets every password without changing IDs or roles', async () => {
  const users = await db.query('SELECT * FROM users ORDER BY id');
  assert.equal(users.find((u) => u.id === 'user-admin')?.username, 'admin@bpskotabatu.com');
  assert.equal(
    users.find((u) => u.id === 'user-supervisor')?.username,
    'supervisor@bpskotabatu.com',
  );
  for (const user of users) {
    assert(await verifyPassword('123456', user.password_hash));
    assert.notEqual(user.password_hash, '123456');
    assert.equal(user.must_change_password, false);
  }
  assert.equal(users.find((u) => u.id === 'user-admin')?.role, 'ADMIN');
  assert.equal(users.find((u) => u.id === 'user-supervisor')?.role, 'SUPERVISOR');
  assert.equal((await db.query('SELECT id FROM employees')).length, 5);
});

test('quick login lists current active accounts and is disabled when testing is off', async () => {
  const response = await request(app).get('/api/auth/options');
  assert.equal(response.status, 200);
  assert.equal(response.body.testingLogin, true);
  assert.equal(response.body.password, '123456');
  assert(response.body.accounts.some((a: any) => a.username === 'admin@bpskotabatu.com'));
  assert(response.body.accounts.some((a: any) => a.username === 'supervisor@bpskotabatu.com'));
  assert(response.body.accounts.some((a: any) => a.role === 'PEGAWAI'));
  assert(!JSON.stringify(response.body).includes('password_hash'));
  process.env.TEST_LOGIN_ENABLED = 'false';
  try {
    assert.deepEqual((await request(app).get('/api/auth/options')).body, {
      testingLogin: false,
      accounts: [],
    });
    await assert.rejects(() => prepareTestingAccounts(db, true));
  } finally {
    process.env.TEST_LOGIN_ENABLED = 'true';
  }
});

test('Admin, Supervisor and Pegawai can access allowed pages on first login without changing password', async () => {
  for (const [username, role, path] of [
    ['admin@bpskotabatu.com', 'ADMIN', '/users'],
    ['supervisor@bpskotabatu.com', 'SUPERVISOR', '/employees'],
    ['199001012020011001', 'PEGAWAI', '/employees/emp-1'],
  ]) {
    const agent = request.agent(app),
      login = await agent.post('/api/auth/login').send({ username, password: '123456' });
    assert.equal(login.status, 200, login.text);
    const me = await agent.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.role, role);
    assert.equal(me.body.must_change_password, false);
    assert.equal((await agent.get('/api' + path)).status, 200, path);
    if (role === 'SUPERVISOR') {
      assert.equal((await agent.get('/api/users')).status, 403);
      assert.equal((await agent.get('/api/assessments/psych/period-2026/emp-1')).status, 403);
    }
    if (role === 'PEGAWAI') assert.equal((await agent.get('/api/employees/emp-2')).status, 403);
  }
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin@bpskotabatu.com', password: 'wrong' })
    ).status,
    401,
  );
});

test('existing-account reset preserves employee data, invalidates sessions, and runs only once on restart', async () => {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ username: 'admin@bpskotabatu.com', password: '123456' });
  const employees = await db.query('SELECT * FROM employees ORDER BY id');
  await db.query(
    "UPDATE users SET username='admin',password_hash=$1,must_change_password=true WHERE id='user-admin'",
    [await hashPassword('OldPassword!2026')],
  );
  const result = await prepareTestingAccounts(db, true);
  assert.equal(result.reset, true);
  assert.equal((await agent.get('/api/auth/me')).status, 401);
  assert.deepEqual(await db.query('SELECT * FROM employees ORDER BY id'), employees);
  const [user] = await db.query("SELECT * FROM users WHERE id='user-admin'");
  assert.equal(user.username, 'admin@bpskotabatu.com');
  assert(await verifyPassword('123456', user.password_hash));
  assert.equal(user.must_change_password, false);
  const fresh = request.agent(app);
  await fresh
    .post('/api/auth/login')
    .send({ username: 'admin@bpskotabatu.com', password: '123456' });
  assert.equal((await prepareTestingAccounts(db)).reset, false);
  assert.equal((await fresh.get('/api/auth/me')).status, 200);
  const logs = await db.query("SELECT metadata FROM audit_logs WHERE action='TEST_ACCOUNTS_RESET'");
  assert.equal(logs.length, 2);
  assert(!JSON.stringify(logs).includes('123456'));
});

test('new accounts and password resets use the same testing password without reintroducing first-login prompts', async () => {
  const agent = request.agent(app),
    login = await agent
      .post('/api/auth/login')
      .send({ username: 'admin@bpskotabatu.com', password: '123456' }),
    csrf = login.body.csrfToken;
  const input = {
    nip: '199901012024011997',
    name: 'Pegawai Login Uji',
    position: 'Statistisi',
    grade: 'III/a',
    unit: 'IPDS',
    active: true,
  };
  const created = await agent.post('/api/employees').set('X-CSRF-Token', csrf).send(input);
  assert.equal(created.status, 201, created.text);
  const account = await agent
    .post(`/api/employees/${created.body.id}/account`)
    .set('X-CSRF-Token', csrf);
  assert.equal(account.status, 201, account.text);
  assert.equal(account.body.temporaryPassword, '123456');
  assert.equal(account.body.mustChangePassword, false);
  const employee = request.agent(app),
    signedIn = await employee
      .post('/api/auth/login')
      .send({ username: input.nip, password: '123456' });
  assert.equal(signedIn.status, 200);
  assert.equal((await employee.get(`/api/employees/${created.body.id}`)).status, 200);
  const [user] = await db.query('SELECT id FROM users WHERE employee_id=$1', [created.body.id]);
  const reset = await agent.post(`/api/users/${user.id}/reset-password`).set('X-CSRF-Token', csrf);
  assert.equal(reset.status, 200);
  assert.equal(reset.body.temporaryPassword, '123456');
  assert.equal(reset.body.mustChangePassword, false);
  assert.equal((await employee.get('/api/auth/me')).status, 401);
  await employee.post('/api/auth/login').send({ username: input.nip, password: '123456' });
  assert.equal((await employee.get('/api/auth/me')).body.must_change_password, false);
});

test('production always disables testing credentials and quick login', async () => {
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(testingLoginEnabled(), false);
    assert.deepEqual((await request(app).get('/api/auth/options')).body, {
      testingLogin: false,
      accounts: [],
    });
    await assert.rejects(() => prepareTestingAccounts(db, true));
  } finally {
    process.env.NODE_ENV = 'test';
  }
});
