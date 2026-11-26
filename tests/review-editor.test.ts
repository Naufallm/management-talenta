import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { connectDb, migrate, type DB } from '../server/db/index.ts';
import { seed } from '../server/db/seed.ts';
import { createApp } from '../server/app.ts';
import { dnaQuestions } from '../server/domain/dna-instrument.ts';
import { dnaVersion } from '../shared/potential-dna.ts';
process.env.NODE_ENV = 'test';
process.env.TEST_LOGIN_ENABLED = 'true';
process.env.PGLITE_DIR = 'memory://';
delete process.env.DATABASE_URL;
process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);
let db: DB, app: ReturnType<typeof createApp>;
type Client = { agent: ReturnType<typeof request.agent>; csrf: string };
let admin: Client, supervisor: Client, employee: Client;
async function login(username: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ username, password: '123456' });
  assert.equal(response.status, 200, response.text);
  return { agent, csrf: response.body.csrfToken };
}
before(async () => {
  db = await connectDb();
  await migrate(db);
  await seed(db);
  await db.query("UPDATE periods SET starts_on='2020-01-01',ends_on='2100-12-31'");
  app = createApp(db);
  admin = await login('admin@bpskotabatu.com');
  supervisor = await login('supervisor@bpskotabatu.com');
  employee = await login('199001012020011005');
});
after(async () => db.close());
const put = (client: Client, path: string, body: object) =>
  client.agent
    .put('/api' + path)
    .set('X-CSRF-Token', client.csrf)
    .send(body);
test('annual CKP editing is atomic, distinguishes zero and empty, stays in employee/year and is Admin-only', async () => {
  const body = {
    employee_id: 'emp-1',
    year: 2026,
    values: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      score: i === 2 ? null : i === 0 ? 0 : 80 + i,
    })),
  };
  for (const client of [supervisor, employee])
    assert.equal((await put(client, '/ckp/yearly', body)).status, 403);
  assert.equal((await admin.agent.put('/api/ckp/yearly').send(body)).status, 403);
  const before = await db.query(
    "SELECT month,score FROM ckp_scores WHERE employee_id='emp-1' AND year=2026 ORDER BY month",
  );
  assert.equal(
    (
      await put(admin, '/ckp/yearly', {
        ...body,
        values: body.values.map((v, i) => ({ ...v, score: i === 11 ? 101 : v.score })),
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await put(admin, '/ckp/yearly', {
        ...body,
        values: body.values.map((v) => ({ ...v, month: 1 })),
      })
    ).status,
    422,
  );
  assert.deepEqual(
    await db.query(
      "SELECT month,score FROM ckp_scores WHERE employee_id='emp-1' AND year=2026 ORDER BY month",
    ),
    before,
  );
  await db.query("UPDATE periods SET status='CLOSED' WHERE year=2026");
  assert.equal((await put(admin, '/ckp/yearly', body)).status, 409);
  await db.query("UPDATE periods SET status='OPEN' WHERE year=2026");
  const response = await put(admin, '/ckp/yearly', body);
  assert.equal(response.status, 200, response.text);
  const rows = await db.query(
    "SELECT month,score FROM ckp_scores WHERE employee_id='emp-1' AND year=2026 ORDER BY month",
  );
  assert.equal(rows.length, 11);
  assert.equal(rows[0].score, 0);
  assert.ok(!rows.some((r) => r.month === 3));
  assert.equal(rows.find((r) => r.month === 12)?.score, 91);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM ckp_scores WHERE employee_id='emp-2' AND year=2026",
      )
    )[0].n,
    9,
  );
  assert.equal(
    (
      await db.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='CKP_YEARLY_UPDATE'")
    )[0].n,
    1,
  );
});
test('Admin edits period DNA text while legacy and draft answers retain their question wording and scores', async () => {
  const answers = Object.fromEntries(dnaQuestions.map((q) => [q.id, q.number === 1 ? 100 : 70]));
  await db.query(
    "INSERT INTO potential_dna_assessments(employee_id,period_id,instrument_version,answers,instructions_accepted_at,submitted_at,result) VALUES('emp-1','period-2026',$1,$2,now(),now(),'{}')",
    [dnaVersion, JSON.stringify(answers)],
  );
  const original = await admin.agent.get('/api/potential-dna/instrument/period-2026');
  assert.equal(original.status, 200, original.text);
  const edits = original.body.questions.map((q: any) => ({
    id: q.id,
    text:
      q.id === 'dna-01'
        ? 'Saya mengembangkan prioritas kerja berdasarkan target yang terukur.'
        : q.text,
  }));
  const body = { revision: original.body.revision, questions: edits };
  for (const client of [supervisor, employee])
    assert.equal((await put(client, '/potential-dna/instrument/period-2026', body)).status, 403);
  assert.equal(
    (await admin.agent.put('/api/potential-dna/instrument/period-2026').send(body)).status,
    403,
  );
  assert.equal(
    (
      await put(admin, '/potential-dna/instrument/period-2026', {
        ...body,
        questions: edits.slice(1),
      })
    ).status,
    422,
  );
  const changed = await put(admin, '/potential-dna/instrument/period-2026', body);
  assert.equal(changed.status, 200, changed.text);
  const archived = await admin.agent.get('/api/potential-dna/period-2026/emp-1');
  assert.equal(archived.body.questions[0].text, dnaQuestions[0].text);
  assert.equal(
    archived.body.result.highlights[dnaQuestions[0].cluster][0].text,
    dnaQuestions[0].text,
  );
  assert.deepEqual(archived.body.answers, answers);
  const fresh = await employee.agent.get('/api/potential-dna/period-2026/emp-5');
  assert.equal(fresh.body.questions[0].text, edits[0].text);
  assert.ok(!('cluster' in fresh.body.questions[0]));
  const draft = {
    version: dnaVersion,
    question_revision: original.body.revision,
    instructions_accepted: true,
    answers: { 'dna-01': 88 },
    submit: false,
  };
  assert.equal((await put(employee, '/potential-dna/period-2026', draft)).status, 409);
  assert.equal(
    (
      await put(employee, '/potential-dna/period-2026', {
        ...draft,
        question_revision: fresh.body.question_revision,
      })
    ).status,
    200,
  );
  const current = await admin.agent.get('/api/potential-dna/instrument/period-2026');
  const second = {
    revision: current.body.revision,
    questions: edits.map((q: any) => ({
      ...q,
      text: q.id === 'dna-01' ? q.text + ' Saya meninjau hasilnya secara berkala.' : q.text,
    })),
  };
  assert.equal((await put(admin, '/potential-dna/instrument/period-2026', second)).status, 200);
  const resumed = await employee.agent.get('/api/potential-dna/period-2026/emp-5');
  assert.equal(resumed.body.questions[0].text, edits[0].text);
  assert.equal(resumed.body.answers['dna-01'], 88);
  assert.equal(
    (
      await put(employee, '/potential-dna/period-2026', {
        ...draft,
        question_revision: fresh.body.question_revision,
      })
    ).status,
    200,
  );
  assert.equal((await put(admin, '/potential-dna/instrument/period-2026', body)).status, 409);
  await db.query(
    "INSERT INTO periods(id,year,name,starts_on,ends_on,status) VALUES('editor-2025',2025,'Tahun sebelumnya','2025-01-01','2025-12-31','CLOSED')",
  );
  const previous = await admin.agent.get('/api/potential-dna/instrument/editor-2025');
  assert.equal(previous.body.questions[0].text, dnaQuestions[0].text);
  assert.equal(
    (
      await put(admin, '/potential-dna/instrument/editor-2025', {
        ...body,
        revision: previous.body.revision,
      })
    ).status,
    409,
  );
});
