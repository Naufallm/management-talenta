import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { connectDb, migrate, type DB } from '../server/db/index.ts';
import { seed } from '../server/db/seed.ts';
import { createApp } from '../server/app.ts';
import { importRows } from '../server/domain/import.ts';
process.env.NODE_ENV = 'test';
process.env.PGLITE_DIR = 'memory://';
delete process.env.DATABASE_URL;
process.env.DATA_ENCRYPTION_KEY = 'b'.repeat(64);
let db: DB, app: ReturnType<typeof createApp>;
type Client = { agent: ReturnType<typeof request.agent>; csrf: string };
let admin: Client, superadmin: Client, leader: Client, employee: Client;
async function login(username: string): Promise<Client> {
  const agent = request.agent(app),
    response = await agent
      .post('/api/auth/login')
      .send({ username, password: process.env.SEED_PASSWORD || 'TalentaDev!2026' });
  assert.equal(response.status, 200, response.text);
  let csrf = response.body.csrfToken;
  const me = await agent.get('/api/auth/me');
  if (me.body.must_change_password) {
    const change = await agent
      .post('/api/auth/password')
      .set('X-CSRF-Token', csrf)
      .send({
        currentPassword: process.env.SEED_PASSWORD || 'TalentaDev!2026',
        password: 'NewSecurePassword!2026',
      });
    assert.equal(change.status, 200, change.text);
    csrf = change.body.csrfToken;
  }
  return { agent, csrf };
}
const mutate = (
  c: Client,
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body: any = {},
) =>
  c.agent[method]('/api' + path)
    .set('X-CSRF-Token', c.csrf)
    .send(body);
before(async () => {
  db = await connectDb();
  await migrate(db);
  await seed(db);
  await db.query("UPDATE periods SET starts_on='2020-01-01',ends_on='2100-12-31'");
  app = createApp(db);
  superadmin = await login('superadmin');
  admin = await login('admin');
  leader = await login('199001012020011001');
  employee = await login('199001012020011005');
});
after(async () => {
  await db.close();
});
test('anonymous API is denied, credentials are checked, CSRF and origin are enforced', async () => {
  assert.equal((await request(app).get('/api/employees')).status, 401);
  assert.equal(
    (await request(app).post('/api/auth/login').send({ username: 'admin', password: 'invalid' }))
      .status,
    401,
  );
  assert.equal((await admin.agent.post('/api/employees').send({})).status, 403);
  assert.equal(
    (
      await admin.agent
        .post('/api/employees')
        .set('X-CSRF-Token', admin.csrf)
        .set('Origin', 'https://evil.invalid')
        .send({})
    ).status,
    403,
  );
});
test('first login requires password change and password replacement invalidates the previous password', async () => {
  const agent = request.agent(app),
    r = await agent.post('/api/auth/login').send({
      username: '199001012020011004',
      password: process.env.SEED_PASSWORD || 'TalentaDev!2026',
    });
  assert.equal(r.status, 200);
  assert.equal((await agent.get('/api/employees/emp-4')).status, 403);
  assert.equal(
    (
      await agent
        .post('/api/auth/password')
        .set('X-CSRF-Token', r.body.csrfToken)
        .send({
          currentPassword: process.env.SEED_PASSWORD || 'TalentaDev!2026',
          password: 'short',
        })
    ).status,
    422,
  );
  const changed = await agent
    .post('/api/auth/password')
    .set('X-CSRF-Token', r.body.csrfToken)
    .send({
      currentPassword: process.env.SEED_PASSWORD || 'TalentaDev!2026',
      password: 'Employee12NewSecure!',
    });
  assert.equal(changed.status, 200);
  assert.equal((await agent.get('/api/employees/emp-4')).status, 200);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({
          username: '199001012020011004',
          password: process.env.SEED_PASSWORD || 'TalentaDev!2026',
        })
    ).status,
    401,
  );
});
test('Admin CRUD employee validates, paginates, prevents duplicates, and soft deletes', async () => {
  const input = {
    nip: '199901012024011999',
    name: 'Pegawai Uji',
    position: 'Statistisi',
    grade: 'III/a',
    unit: 'IPDS',
    email: 'uji@example.invalid',
    phone: '08123456789',
    active: true,
  };
  assert.equal((await mutate(admin, 'post', '/employees', { ...input, nip: '123' })).status, 422);
  const created = await mutate(admin, 'post', '/employees', input);
  assert.equal(created.status, 201, created.text);
  const id = created.body.id;
  assert.equal((await mutate(admin, 'post', '/employees', input)).status, 409);
  const list = await admin.agent.get('/api/employees?q=Pegawai%20Uji&limit=1');
  assert.equal(list.body.total, 1);
  assert.equal(list.body.rows.length, 1);
  assert.equal(
    (await mutate(admin, 'put', `/employees/${id}`, { ...input, name: 'Pegawai Uji Edit' })).status,
    200,
  );
  assert.equal(
    (await admin.agent.get(`/api/employees/${id}`)).body.employee.name,
    'Pegawai Uji Edit',
  );
  assert.equal((await mutate(admin, 'delete', `/employees/${id}`)).status, 200);
  assert.equal((await admin.agent.get(`/api/employees/${id}`)).body.employee.active, false);
  assert.equal((await admin.agent.get('/api/employees?q=Pegawai%20Uji')).body.total, 0);
  assert.equal(
    (await admin.agent.get('/api/employees?q=Pegawai%20Uji&status=inactive')).body.total,
    1,
  );
});
test('employee cannot access another employee, aggregate reports, team roster, users, or audit logs', async () => {
  for (const path of [
    '/employees/emp-1',
    '/employees',
    '/reports/period-2026',
    '/teams',
    '/users',
    '/audit-logs',
  ])
    assert.equal((await employee.agent.get('/api' + path)).status, 403, path);
  assert.equal((await employee.agent.get('/api/employees/emp-5')).status, 200);
  const ckp = await employee.agent.get('/api/ckp?year=2026&employee_id=emp-1');
  assert(ckp.body.rows.every((r: any) => r.employee_id === 'emp-5'));
  const points = await employee.agent.get('/api/talent/period-2026');
  assert(points.body.every((r: any) => r.employee_id === 'emp-5'));
  assert.equal(
    (await mutate(admin, 'patch', '/users/user-admin', { role: 'ADMIN', active: true })).status,
    400,
  );
});
test('Admin can read psychological answers/results; other employees are denied and reads are audited', async () => {
  assert.equal((await admin.agent.get('/api/assessments/psych/period-2026/emp-5')).status, 200);
  assert.equal((await leader.agent.get('/api/assessments/psych/period-2026/emp-5')).status, 403);
  assert.equal((await employee.agent.get('/api/assessments/psych/period-2026/emp-5')).status, 200);
  const response = await superadmin.agent.get('/api/assessments/psych/period-2026/emp-5');
  assert.equal(response.status, 200);
  assert.equal(response.body.result.status, 'Belum dapat dihitung');
  const profile = await admin.agent.get('/api/employees/emp-5');
  assert(!JSON.stringify(profile.body).includes('psych'));
  assert(!JSON.stringify(profile.body).includes('encrypted'));
  const logs = await db.query("SELECT * FROM audit_logs WHERE action='PSYCH_READ'");
  assert(logs.length >= 2);
  assert(logs.every((r) => !JSON.stringify(r.metadata).includes('answers')));
});
test('psych answers are encrypted at rest, locked after submit, with no fabricated clinical score', async () => {
  const result = await mutate(employee, 'put', '/assessments/psych/period-2026', {
    answers: { 'psych-1': 4, 'psych-2': 5 },
    submit: true,
  });
  assert.equal(result.status, 200, result.text);
  const [stored] = await db.query("SELECT * FROM psych_answers WHERE employee_id='emp-5'");
  assert(!stored.encrypted_answers.includes('psych-1'));
  assert(stored.encrypted_answers.startsWith('v1.'));
  const read = await employee.agent.get('/api/assessments/psych/period-2026/emp-5');
  assert.deepEqual(read.body.answers, { 'psych-1': 4, 'psych-2': 5 });
  assert(!('score' in read.body.result));
  assert.equal(
    (
      await mutate(employee, 'put', '/assessments/psych/period-2026', {
        answers: { 'psych-1': 1 },
        submit: false,
      })
    ).status,
    409,
  );
});
test('potential draft persists, incomplete submission fails, concurrent submit is serialized, then locked', async () => {
  const path = '/assessments/potential/period-2026';
  assert.equal(
    (await mutate(employee, 'put', path, { answers: { 'question-1': 5 }, submit: false })).status,
    200,
  );
  assert.equal(
    (await employee.agent.get('/api/assessments/potential/period-2026/emp-5')).body.answers[
      'question-1'
    ],
    5,
  );
  assert.equal(
    (await mutate(employee, 'put', path, { answers: { 'question-1': 5 }, submit: true })).status,
    422,
  );
  const answers = {
    'question-1': 5,
    'question-2': 5,
    'question-3': 5,
    'question-4': 1,
    'question-5': 1,
    'question-6': 1,
  };
  const responses = await Promise.all([
    mutate(employee, 'put', path, { answers, submit: true }),
    mutate(employee, 'put', path, { answers, submit: true }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  const profile = await employee.agent.get('/api/employees/emp-5');
  assert.equal(profile.body.potential[0].score, 50);
  assert.equal((await mutate(employee, 'put', path, { answers, submit: false })).status, 409);
});
test('config change recalculates scores consistently and locked question banks prevent instrument drift', async () => {
  const config = (await admin.agent.get('/api/periods/period-2026/config')).body;
  const changed = await mutate(admin, 'put', '/periods/period-2026/config', {
    ...config,
    managerial_weight: 80,
    technical_weight: 20,
  });
  assert.equal(changed.status, 200, changed.text);
  const profile = await employee.agent.get('/api/employees/emp-5');
  assert.equal(profile.body.potential[0].score, 80);
  assert.equal(profile.body.potential[0].config_version, 2);
  assert.equal(
    (
      await mutate(admin, 'post', '/periods/period-2026/questions/potential', {
        text: 'Pertanyaan tambahan',
        category: 'TEKNIS',
        sort_order: 7,
        active: true,
      })
    ).status,
    409,
  );
});
test('assigned leader can draft and submit only their member; submitted assessment locks', async () => {
  await db.query("DELETE FROM leader_assessments WHERE employee_id='emp-3'");
  const indicators = {
    'Kualitas pekerjaan': 90,
    'Kolaborasi tim': 80,
    'Tanggung jawab': 70,
    'Pemecahan masalah': 100,
  };
  assert.equal(
    (
      await mutate(leader, 'put', '/leader/period-2026', {
        employee_id: 'emp-4',
        indicators,
        submit: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await mutate(leader, 'put', '/leader/period-2026', {
        employee_id: 'emp-1',
        indicators,
        submit: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await mutate(leader, 'put', '/leader/period-2026', {
        employee_id: 'emp-3',
        indicators,
        submit: false,
      })
    ).status,
    200,
  );
  const submitted = await mutate(leader, 'put', '/leader/period-2026', {
    employee_id: 'emp-3',
    indicators,
    submit: true,
  });
  assert.equal(submitted.status, 200, submitted.text);
  assert.equal(
    (
      await mutate(leader, 'put', '/leader/period-2026', {
        employee_id: 'emp-3',
        indicators,
        submit: false,
      })
    ).status,
    409,
  );
  const profile = await admin.agent.get('/api/employees/emp-3');
  assert.equal(profile.body.competency[0].leader, 85);
  assert(profile.body.competency[0].score <= 100);
});
test('CKP changes have no effect on talent quadrant or its axes', async () => {
  const before = (await admin.agent.get('/api/talent/period-2026')).body.find(
    (r: any) => r.employee_id === 'emp-4',
  );
  assert(before);
  assert.equal(
    (await mutate(admin, 'post', '/ckp', { employee_id: 'emp-4', year: 2026, month: 10, score: 0 }))
      .status,
    201,
  );
  const after = (await admin.agent.get('/api/talent/period-2026')).body.find(
    (r: any) => r.employee_id === 'emp-4',
  );
  assert.deepEqual(after, before);
  assert.equal(
    (
      await mutate(admin, 'post', '/ckp', {
        employee_id: 'emp-4',
        year: 2026,
        month: 10,
        score: 90,
      })
    ).status,
    409,
  );
});
test('CKP and report pagination preserve aggregate values and full CSV export', async () => {
  const first = await admin.agent.get('/api/ckp?year=2026&page=1&limit=2'),
    second = await admin.agent.get('/api/ckp?year=2026&page=2&limit=2');
  assert.equal(first.status, 200);
  assert.equal(first.body.rows.length, 2);
  assert.equal(second.body.rows.length, 2);
  assert.notEqual(first.body.rows[0].id, second.body.rows[0].id);
  assert.equal(first.body.average, second.body.average);
  assert.deepEqual(first.body.trend, second.body.trend);
  assert(first.body.total > 2);
  const report = await admin.agent.get('/api/reports/period-2026?limit=2');
  assert.equal(report.body.rows.length, 2);
  assert(report.body.total > 2);
  const csv = await admin.agent.get('/api/reports/period-2026?format=csv&limit=2');
  assert.equal(csv.status, 200);
  assert.equal(csv.text.trim().split(/\r?\n/).length, report.body.total + 1);
  assert(!csv.text.includes('psych'));
});
test('CKP import validates every row and rolls back all writes on any error', async () => {
  const nip = '199001012020011005',
    bad = `nip,bulan,tahun,skor\n${nip},10,2026,90\n${nip},11,2026,101`,
    before = await db.query('SELECT id FROM ckp_scores');
  const preview = await admin.agent
    .post('/api/ckp/import')
    .set('X-CSRF-Token', admin.csrf)
    .field('action', 'preview')
    .attach('file', Buffer.from(bad), 'bad.csv');
  assert.equal(preview.status, 200, preview.text);
  assert(preview.body.rows[1].error);
  assert.equal(
    (
      await admin.agent
        .post('/api/ckp/import')
        .set('X-CSRF-Token', admin.csrf)
        .field('action', 'commit')
        .attach('file', Buffer.from(bad), 'bad.csv')
    ).status,
    422,
  );
  assert.equal((await db.query('SELECT id FROM ckp_scores')).length, before.length);
  const good = bad.replace(',101', ',95'),
    committed = await admin.agent
      .post('/api/ckp/import')
      .set('X-CSRF-Token', admin.csrf)
      .field('action', 'commit')
      .attach('file', Buffer.from(good), 'good.csv');
  assert.equal(committed.status, 200, committed.text);
  assert.equal(committed.body.total, 2);
});
test('Excel import preserves 18-digit NIP text and rejects unsupported file formats', async () => {
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet('CKP');
  sheet.addRow(['nip', 'bulan', 'tahun', 'skor']);
  sheet.addRow(['199001012020011004', 12, 2026, 92]);
  const data = Buffer.from(await book.xlsx.writeBuffer());
  const rows = await importRows(data, 'ckp.xlsx');
  assert.equal(rows[1][0], '199001012020011004');
  assert.equal(rows[1][3], '92');
  await assert.rejects(() => importRows(Buffer.from('x'), 'x.exe'));
});
test('employee can upload own certificates; Admin verification recalculates competency; downloads enforce ownership', async () => {
  const payload = {
    employee_id: 'emp-5',
    kind: 'training',
    name: 'Pelatihan Uji',
    activity_type: 'Teknis',
    activity_date: '2026-09-01',
    organizer: 'Penyelenggara Uji',
    hours: 40,
    document_id: null,
    verified: true,
  };
  assert.equal((await mutate(employee, 'post', '/evidence/period-2026', payload)).status, 201);
  const doc = await admin.agent
    .post('/api/documents')
    .set('X-CSRF-Token', admin.csrf)
    .field('employee_id', 'emp-5')
    .field('period_id', 'period-2026')
    .attach('file', Buffer.from('%PDF-1.4\n%%EOF'), 'bukti.pdf');
  assert.equal(doc.status, 201, doc.text);
  assert.equal((await leader.agent.get('/api/documents/' + doc.body.id)).status, 403);
  assert.equal((await employee.agent.get('/api/documents/' + doc.body.id)).status, 200);
  const evidence = await mutate(admin, 'post', '/evidence/period-2026', {
    ...payload,
    document_id: doc.body.id,
  });
  assert.equal(evidence.status, 201, evidence.text);
  const profile = await employee.agent.get('/api/employees/emp-5');
  assert.equal(profile.body.competency[0].evidence, 100);
  assert.equal(profile.body.competency[0].score, null);
});
test('reopening requires a reason, revokes the score, and records the action', async () => {
  assert.equal(
    (
      await mutate(admin, 'post', '/assessments/potential/period-2026/emp-5/reopen', {
        reason: 'short',
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await mutate(admin, 'post', '/assessments/potential/period-2026/emp-5/reopen', {
        reason: 'Perbaikan data atas permintaan pegawai',
      })
    ).status,
    200,
  );
  assert.equal((await employee.agent.get('/api/employees/emp-5')).body.potential.length, 0);
  const logs = await db.query("SELECT * FROM audit_logs WHERE action='POTENTIAL_REOPEN'");
  assert.equal(logs.length, 1);
});
test('logout revokes server-side session', async () => {
  assert.equal((await mutate(employee, 'post', '/auth/logout')).status, 200);
  assert.equal((await employee.agent.get('/api/auth/me')).status, 401);
});

test('Supervisor reads data and provides optional feedback outside closed periods, with all management writes denied', async () => {
  const supervisor = await login('supervisor');
  const directory = await supervisor.agent.get('/api/employees');
  assert.equal(directory.status, 200);
  assert.equal((await supervisor.agent.get('/api/employees/emp-1')).status, 200);
  for (const path of ['/users', '/audit-logs', '/assessments/psych/period-2026/emp-1'])
    assert.equal((await supervisor.agent.get('/api' + path)).status, 403, path);
  for (const [method, path, body] of [
    ['post', '/employees', {}],
    ['put', '/employees/emp-1', {}],
    ['delete', '/employees/emp-1', {}],
    ['post', '/ckp', {}],
    ['post', '/periods', {}],
    ['put', '/periods/period-2026/config', {}],
    ['post', '/periods/period-2026/questions/psych', {}],
    ['post', '/evidence/period-2026', {}],
    ['put', '/leader/period-2026', {}],
    ['delete', '/psychology/period-2026/emp-1', {}],
  ] as const)
    assert.equal((await mutate(supervisor, method, path, body)).status, 403, path);
  await db.query("UPDATE periods SET status='CLOSED' WHERE id='period-2026'");
  try {
    assert.equal(
      (
        await mutate(supervisor, 'post', '/employees/emp-1/feedback', {
          content: 'Apresiasi untuk kolaborasi tim.',
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await mutate(supervisor, 'post', '/employees/emp-1/feedback', {
          content: 'Saran pengembangan berikutnya.',
        })
      ).status,
      201,
    );
    const reviews = await leader.agent.get('/api/employees/emp-1/feedback');
    assert.equal(reviews.status, 200);
    assert.equal(reviews.body.length, 2);
    assert.equal((await employee.agent.get('/api/employees/emp-1/feedback')).status, 401); // employee logged out in prior test
    assert.equal(
      (await mutate(supervisor, 'post', '/employees/emp-1/feedback', { content: ' ' })).status,
      422,
    );
  } finally {
    await db.query("UPDATE periods SET status='OPEN' WHERE id='period-2026'");
  }
});
test('Admin creates, updates and deletes encrypted psychology data with audit trail', async () => {
  const path = '/psychology/period-2026/emp-2';
  for (const message of ['Catatan awal untuk pengembangan.', 'Catatan hasil diperbarui.']) {
    const saved = await mutate(admin, 'put', path, {
      answers: { 'psych-1': 3 },
      result: { status: 'Ditinjau Admin', message },
    });
    assert.equal(saved.status, 200, saved.text);
    const read = await admin.agent.get('/api/assessments/psych/period-2026/emp-2');
    assert.equal(read.body.result.message, message);
    const [stored] = await db.query(
      "SELECT encrypted_result FROM psych_results WHERE employee_id='emp-2'",
    );
    assert(!stored.encrypted_result.includes(message));
  }
  assert.equal((await mutate(admin, 'delete', path)).status, 200);
  assert.equal((await db.query("SELECT * FROM psych_answers WHERE employee_id='emp-2'")).length, 0);
  assert.equal(
    (await db.query("SELECT * FROM audit_logs WHERE action IN ('PSYCH_SAVE','PSYCH_DELETE')"))
      .length,
    3,
  );
});
