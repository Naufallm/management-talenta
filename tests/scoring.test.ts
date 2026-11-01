import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potentialScore, quadrant } from '../server/domain/scoring.ts';
import { scoreConfigSchema, type Question, type ScoreConfig } from '../shared/contracts.ts';
import { parseCsv, csvCell } from '../server/domain/import.ts';
import { encrypt, decrypt, hashPassword, verifyPassword } from '../server/security.ts';
process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64);
const config: ScoreConfig = {
  managerial_weight: 25,
  technical_weight: 75,
  evidence_weight: 50,
  leader_weight: 50,
  potential_threshold: 50,
  competency_threshold: 50,
  training_hours_target: 40,
  achievement_points: 10,
  employee_uploads: false,
  version: 1,
};
const questions: Question[] = [
  {
    id: 'm',
    period_id: 'p',
    text: 'Manajerial',
    category: 'MANAJERIAL',
    sort_order: 1,
    active: true,
  },
  { id: 't', period_id: 'p', text: 'Teknis', category: 'TEKNIS', sort_order: 2, active: true },
];
test('potential scores normalize scale and apply configured category weights', () => {
  assert.deepEqual(potentialScore(questions, { m: 5, t: 1 }, config), {
    managerial: 100,
    technical: 0,
    score: 25,
  });
  assert.equal(potentialScore(questions, { m: 1, t: 5 }, config).score, 75);
  assert.equal(potentialScore(questions, { m: 3, t: 3 }, config).score, 50);
  assert.throws(() => potentialScore(questions, { m: 5 }, config));
});
test('quadrant threshold boundaries are inclusive, configurable, and accept only potential and competency', () => {
  assert.equal(quadrant(50, 50, config), 'Talenta Unggul');
  assert.equal(quadrant(49.99, 50, config), 'Profesional Andal');
  assert.equal(quadrant(0, 0, config), 'Perlu Pengembangan');
  assert.equal(quadrant(100, 49.99, config), 'Talenta Berkembang');
  assert.equal(
    quadrant(50, 50, { potential_threshold: 60, competency_threshold: 60 }),
    'Perlu Pengembangan',
  );
});
test('configuration rejects invalid weights and nonpositive training target', () => {
  assert.equal(scoreConfigSchema.safeParse({ ...config, managerial_weight: 20 }).success, false);
  assert.equal(scoreConfigSchema.safeParse({ ...config, training_hours_target: 0 }).success, false);
});
test('CSV parser handles BOM, quoted fields, separators, and malformed input', () => {
  assert.deepEqual(parseCsv('\uFEFFnip,bulan,tahun,skor\r\n"123",1,2026,90'), [
    ['nip', 'bulan', 'tahun', 'skor'],
    ['123', '1', '2026', '90'],
  ]);
  assert.deepEqual(parseCsv('a;b\n"x;y";"a""b"'), [
    ['a', 'b'],
    ['x;y', 'a"b'],
  ]);
  assert.throws(() => parseCsv('a,b\n"x,y'));
  assert.equal(csvCell('=SUM(A1)'), `"'=SUM(A1)"`);
});
test('AES-GCM uses randomized encryption and rejects tampering', () => {
  const first = encrypt({ private: 'sensitive response' }),
    second = encrypt({ private: 'sensitive response' });
  assert.notEqual(first, second);
  assert(!first.includes('sensitive'));
  assert.deepEqual(decrypt(first), { private: 'sensitive response' });
  const parts = first.split('.');
  parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decrypt(parts.join('.')));
});
test('password hashing uses a unique salt and rejects wrong passwords', async () => {
  const a = await hashPassword('StrongPassword!123'),
    b = await hashPassword('StrongPassword!123');
  assert.notEqual(a, b);
  assert(await verifyPassword('StrongPassword!123', a));
  assert(!(await verifyPassword('wrong', a)));
});
