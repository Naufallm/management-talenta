import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  defaultNineBoxConfig as config,
  calculateNineBox,
  boxNumber,
  awardPoints,
  normalizeEducation,
  type ScoringSources,
} from '../shared/nine-box.ts';
import { connectDb, migrate, type DB } from '../server/db/index.ts';
import { seed } from '../server/db/seed.ts';
import { createApp } from '../server/app.ts';
import { nineBoxDataset } from '../server/domain/nine-box.ts';
import { dnaQuestions } from '../server/domain/dna-instrument.ts';
import { nineBoxConfigSchema } from '../shared/nine-box-validation.ts';
const full: ScoringSources = {
  training_hours: 40,
  experience_points: 20,
  assessment: 100,
  education: 100,
  field_match: 10,
  ckp: 100,
  award_points: [25],
  unclassified_awards: 0,
  leader: 100,
};
test('nine box numbering matches reference at all boundaries', () => {
  const values = [0, 60, 80];
  const expected = [
    [1, 3, 6],
    [2, 5, 8],
    [4, 7, 9],
  ];
  values.forEach((y, i) =>
    values.forEach((x, j) => assert.equal(boxNumber(x, y, config), expected[i][j])),
  );
  assert.equal(boxNumber(59.99, 79.99, config), 2);
  assert.equal(boxNumber(100, 100, config), 9);
  assert.equal(
    nineBoxConfigSchema.safeParse({ ...config, x_medium_from: 80, x_high_from: 80 }).success,
    false,
  );
});
test('weights sum to 100 on each axis; hours and highest experience cannot exceed cap', () => {
  const score = calculateNineBox(full, config);
  assert.equal(score.x, 100);
  assert.equal(score.y, 100);
  const half = calculateNineBox(
    {
      training_hours: 20,
      experience_points: 5,
      assessment: 80,
      education: 80,
      field_match: 10,
      ckp: 90,
      award_points: [5, 25, 10],
      unclassified_awards: 0,
      leader: 80,
    },
    config,
  );
  assert.equal(half.x, 68.5);
  assert.equal(half.y, 90);
  assert.equal(half.box, 7);
  assert.equal(
    calculateNineBox({ ...full, training_hours: 1000, experience_points: 100 }, config).x,
    100,
  );
  assert.equal(normalizeEducation('DIV/S1'), 'D4/S1');
  assert.equal(normalizeEducation('SMA/MAN/SMEA'), 'SMA');
});
test('award contribution uses highest, not volume; missing input differs from legitimate zero', () => {
  for (const [scope, points] of [
    ['INTERNAL', [5, 10, 20]],
    ['EXTERNAL', [10, 15, 25]],
  ] as const) {
    ['CITY', 'PROVINCE', 'NATIONAL'].forEach((level, i) =>
      assert.equal(awardPoints(level as 'CITY', scope), points[i]),
    );
  }
  assert.equal(
    calculateNineBox({ ...full, award_points: [5, 5, 5] }, config).y_parts[1].contribution,
    3,
  );
  assert.equal(
    calculateNineBox({ ...full, award_points: [5, 5, 5] }, { ...config, award_mode: 'CAPPED_SUM' })
      .y_parts[1].contribution,
    9,
  );
  const missing = calculateNineBox(
    { ...full, assessment: null, education: null, field_match: null },
    config,
  );
  assert.equal(missing.box, null);
  assert.equal(missing.x, null);
  assert.equal(missing.y, 100);
  assert.equal(calculateNineBox({ ...full, unclassified_awards: 1 }, config).y, null);
  const zero = calculateNineBox(
    {
      ...full,
      training_hours: 0,
      experience_points: 0,
      assessment: 0,
      education: 0,
      field_match: 0,
      ckp: 0,
      award_points: [],
      leader: 0,
    },
    config,
  );
  assert.equal(zero.x, 0);
  assert.equal(zero.y, 0);
  assert.equal(zero.box, 1);
});
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
  await db.query("UPDATE periods SET starts_on='2020-01-01',ends_on='2100-12-31'");
  app = createApp(db);
});
after(async () => db.close());
async function login(username: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ username, password: '123456' });
  assert.equal(response.status, 200, response.text);
  return { agent, csrf: response.body.csrfToken };
}
test('live dataset uses raw DNA mean, year, verified evidence, highest role, and elapsed CKP months', async () => {
  await db.query(
    "UPDATE trainings SET hours=40,activity_date='2026-01-01' WHERE employee_id='emp-1'",
  );
  await db.query("UPDATE ckp_scores SET score=80 WHERE employee_id='emp-1' AND year=2026");
  await db.query(
    "INSERT INTO ckp_scores(id,employee_id,month,year,score,created_by) VALUES('future-ckp','emp-1',12,2026,100,'user-admin'),('past-ckp','emp-1',1,2025,0,'user-admin')",
  );
  await db.query(
    "INSERT INTO nine_box_inputs(employee_id,period_id,education_level,field_match,field_match_note,updated_by) VALUES('emp-1','period-2026','D4/S1',true,'Statistika dan pelatihan data','user-admin')",
  );
  await db.query(
    "INSERT INTO leader_assessments(id,period_id,employee_id,leader_id,score,submitted_at) VALUES('nine-leader','period-2026','emp-1','emp-2',80,now())",
  );
  const answers = Object.fromEntries(
    dnaQuestions.map((q) => [q.id, q.cluster === 'DRIVE' ? 90 : 60]),
  );
  await db.query(
    "INSERT INTO potential_dna_assessments(employee_id,period_id,instrument_version,answers,instructions_accepted_at,submitted_at,result) VALUES('emp-1','period-2026','dna-v1',$1,now(),now(),'{}')",
    [JSON.stringify(answers)],
  );
  await db.query(
    "INSERT INTO achievements(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,verified,created_by,award_level,award_scope) VALUES('nine-award','emp-1','period-2026','Penghargaan nasional','Prestasi','2026-01-01','Instansi',0,true,'user-admin','NATIONAL','EXTERNAL')",
  );
  const atJune = await nineBoxDataset(
    db,
    'period-2026',
    'emp-1',
    '',
    new Date('2026-06-30T10:00:00Z'),
  );
  const row = atJune.rows[0];
  assert.equal(row.x_parts.find((p) => p.key === 'assessment')?.raw, 70);
  assert.equal(row.x_parts.find((p) => p.key === 'experience')?.raw, 20);
  assert.equal(row.y_parts[0].raw, 80);
  assert.equal(row.y_parts[1].contribution, 15);
  assert.equal(row.x, 88);
  const december = await nineBoxDataset(
    db,
    'period-2026',
    'emp-1',
    '',
    new Date('2027-01-01T10:00:00Z'),
  );
  assert.equal(december.rows[0].y_parts[0].raw, 82);
  await db.query("UPDATE achievements SET verified=false WHERE id='nine-award'");
  assert.equal(
    (await nineBoxDataset(db, 'period-2026', 'emp-1')).rows[0].y_parts[1].contribution,
    0,
  );
  await db.query(
    "UPDATE achievements SET verified=true,award_level=NULL,award_scope=NULL WHERE id='nine-award'",
  );
  assert.equal((await nineBoxDataset(db, 'period-2026', 'emp-1')).rows[0].y, null);
});
test('per-training relevance and bulk verification respect evidence, role, period and retries', async () => {
  const admin = await login('admin@bpskotabatu.com');
  const employee = await login('199001012020011001');
  const period = 'period-2026';
  await db.query(
    "INSERT INTO documents(id,employee_id,name,mime,contents) VALUES('bulk-doc','emp-1','bukti.pdf','application/pdf','x')",
  );
  for (const [id, doc] of [
    ['rated-a', 'bulk-doc'],
    ['rated-b', 'bulk-doc'],
    ['no-proof', null],
  ]) {
    await db.query(
      "INSERT INTO trainings(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,document_id,created_by) VALUES($1,'emp-1',$2,'Statistik','Teknis','2026-01-01','BPS',1,$3,'user-admin')",
      [id, period, doc],
    );
  }
  const path = '/api/evidence/' + period + '/training/emp-1/verify-all';
  const ids = ['rated-a', 'rated-b', 'no-proof'];
  const bulk = () => admin.agent.post(path).set('X-CSRF-Token', admin.csrf).send({ ids });
  const rate = (id: string, value: boolean) =>
    employee.agent
      .patch('/api/evidence/training/' + id + '/relevance')
      .set('X-CSRF-Token', employee.csrf)
      .send({ job_match: value });
  await db.query("UPDATE trainings SET name='Komunikasi Pelayanan Publik' WHERE id='rated-a'");
  assert.equal((await rate('rated-b', false)).status, 200);
  assert.equal(
    (await employee.agent.post(path).set('X-CSRF-Token', employee.csrf).send({ ids })).status,
    403,
  );
  assert.equal((await bulk()).body.count, 2);
  assert.equal(
    (await db.query("SELECT job_match FROM trainings WHERE id='rated-a'"))[0].job_match,
    true,
  );
  assert.equal((await bulk()).body.count, 0);
  assert.equal((await rate('rated-b', true)).status, 403);
  const raw = async () =>
    (await nineBoxDataset(db, period, 'emp-1')).rows[0].x_parts.find((p) => p.key === 'field_match')
      ?.raw;
  await db.query(
    "UPDATE trainings SET job_match=NULL WHERE employee_id='emp-1' AND NOT(id=ANY($1::text[]))",
    [ids],
  );
  assert.equal(await raw(), null);
  await db.query(
    "UPDATE trainings SET verified=false WHERE employee_id='emp-1' AND NOT(id=ANY($1::text[]))",
    [ids],
  );
  assert.equal(await raw(), 5);
  await db.query("UPDATE periods SET status='CLOSED' WHERE id=$1", [period]);
  assert.equal((await bulk()).status, 409);
  await db.query("UPDATE periods SET status='OPEN' WHERE id=$1", [period]);
  await db.query('DELETE FROM trainings WHERE id=ANY($1::text[])', [ids]);
});
test('example enrichment only adds pending courses and awards to identified examples', async () => {
  await db.query(
    "INSERT INTO trainings(id,employee_id,period_id,name,activity_type,activity_date,organizer,hours,created_by) VALUES('review-release-test','emp-1','period-2026','Teknis','Teknis','2026-01-01','BPS',6,'user-admin')",
  );
  await db.query("DELETE FROM schema_migrations WHERE name='011_training_examples.sql'");
  await migrate(db);
  await migrate(db);
  const courses = await db.query(
    "SELECT employee_id,verified,document_id FROM trainings WHERE id LIKE 'course-example-%'",
  );
  assert.equal(courses.length, 2);
  assert.ok(courses.every((r) => r.employee_id === 'emp-1' && !r.verified));
  assert.equal(courses.filter((r) => r.document_id).length, 1);
  assert.equal(
    (
      await db.query(
        "SELECT id FROM achievements WHERE id LIKE 'course-example-%' AND NOT verified",
      )
    ).length,
    1,
  );
});
test('API scopes employees to own data, supervisors read all, only Admin writes with CSRF', async () => {
  const admin = await login('admin@bpskotabatu.com'),
    supervisor = await login('supervisor@bpskotabatu.com'),
    employee = await login('199001012020011001');
  assert.equal((await request(app).get('/api/nine-box/period-2026')).status, 401);
  const own = await employee.agent.get('/api/nine-box/period-2026?employeeId=emp-2');
  assert.equal(own.status, 200, own.text);
  assert.deepEqual(
    own.body.rows.map((r: any) => r.employee_id),
    ['emp-1'],
  );
  assert.equal(own.body.total, 1);
  assert.equal((await employee.agent.get('/api/nine-box/period-2026/inputs/emp-2')).status, 403);
  assert.equal((await employee.agent.get('/api/nine-box/period-2026/export')).status, 403);
  assert.equal((await supervisor.agent.get('/api/nine-box/period-2026')).body.total, 5);
  assert.equal((await supervisor.agent.get('/api/nine-box/period-2026/export')).status, 200);
  const path = '/api/nine-box/period-2026/config';
  assert.equal((await admin.agent.put(path).send(config)).status, 403);
  assert.equal(
    (await supervisor.agent.put(path).set('X-CSRF-Token', supervisor.csrf).send(config)).status,
    403,
  );
  assert.equal(
    (await employee.agent.put(path).set('X-CSRF-Token', employee.csrf).send(config)).status,
    403,
  );
  assert.equal(
    (await admin.agent.put(path).set('X-CSRF-Token', admin.csrf).send(config)).status,
    200,
  );
  const input = {
    assessment_score: null,
    assessment_source: '',
    assessment_date: null,
    education_level: 'S2',
    field_match: true,
    field_match_note: 'Bidang sesuai pendidikan',
  };
  const inputPath = '/api/nine-box/period-2026/inputs/emp-1';
  assert.equal(
    (await supervisor.agent.put(inputPath).set('X-CSRF-Token', supervisor.csrf).send(input)).status,
    403,
  );
  assert.equal(
    (
      await admin.agent
        .put(inputPath)
        .set('X-CSRF-Token', admin.csrf)
        .send({ ...input, field_match_note: '' })
    ).status,
    422,
  );
  assert.equal(
    (await admin.agent.put(inputPath).set('X-CSRF-Token', admin.csrf).send(input)).status,
    200,
  );
  const classify = await admin.agent
    .patch('/api/nine-box/period-2026/awards/nine-award')
    .set('X-CSRF-Token', admin.csrf)
    .send({ award_level: 'NATIONAL', award_scope: 'EXTERNAL' });
  assert.equal(classify.status, 200, classify.text);
  const updated = await admin.agent.get('/api/nine-box/period-2026');
  assert.equal(updated.body.rows[0].x_parts.find((p: any) => p.key === 'education').raw, 90);
  assert.notEqual(updated.body.rows[0].box, null);
  const context = await employee.agent.get(inputPath);
  assert.equal(context.status, 200, context.text);
  assert.equal(context.body.teams[0].is_leader, true);
  await db.query("UPDATE periods SET status='CLOSED' WHERE id='period-2026'");
  assert.equal(
    (await admin.agent.put(path).set('X-CSRF-Token', admin.csrf).send(config)).status,
    409,
  );
  assert.equal(
    (await admin.agent.put(inputPath).set('X-CSRF-Token', admin.csrf).send(input)).status,
    409,
  );
  assert.equal((await admin.agent.get('/api/nine-box/period-2026')).status, 200);
});
