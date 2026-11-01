import { randomUUID } from 'node:crypto';
import type { DB } from './index.ts';
import { hashPassword } from '../security.ts';
import { potentialScore, calculateEmployee } from '../domain/scoring.ts';
import type { Question, ScoreConfig } from '../../shared/contracts.ts';
export async function seed(db: DB) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development seed is disabled in production.');
  if ((await db.query('SELECT id FROM users LIMIT 1')).length) return;
  const password = process.env.SEED_PASSWORD || 'TalentaDev!2026';
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO periods VALUES('period-2026',2026,'Penilaian Talenta 2026','2026-01-01','2026-12-31','OPEN')`,
    );
    await tx.query(`INSERT INTO score_config(period_id) VALUES('period-2026')`);
    const teams = [
      'IPDS',
      'Statistik Sosial',
      'Statistik Produksi',
      'Statistik Distribusi',
      'Neraca Wilayah',
      'Umum',
    ];
    for (let i = 0; i < teams.length; i++)
      await tx.query('INSERT INTO teams VALUES($1,$2)', [`team-${i + 1}`, teams[i]]);
    await tx.query(
      `INSERT INTO users(id,username,password_hash,role) VALUES('user-super','superadmin',$1,'SUPER_ADMIN'),('user-admin','admin',$1,'ADMIN')`,
      [hash],
    );
    const names = [
      'Aditya Pratama',
      'Nadia Putri',
      'Rizky Firmansyah',
      'Dewi Anggraini',
      'Fajar Nugroho',
      'Intan Permatasari',
      'Bagas Saputra',
      'Ayu Lestari',
      'Dimas Ramadhan',
      'Sinta Maharani',
      'Arif Wicaksono',
      'Rani Kusuma',
    ];
    for (let i = 0; i < names.length; i++) {
      const id = `emp-${i + 1}`,
        nip = `199001012020011${String(i + 1).padStart(3, '0')}`,
        team = i % 6;
      await tx.query(
        'INSERT INTO employees(id,nip,name,position,grade,unit,email) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          id,
          nip,
          names[i],
          team === 0
            ? 'Pranata Komputer Ahli Pertama'
            : team === 5
              ? 'Analis SDM Aparatur'
              : 'Statistisi Ahli Pertama',
          i % 3 === 0 ? 'III/c' : 'III/b',
          teams[team],
          `contoh${i + 1}@example.invalid`,
        ],
      );
      await tx.query(
        'INSERT INTO users(id,username,password_hash,role,employee_id) VALUES($1,$2,$3,$4,$5)',
        [`user-${i + 1}`, nip, hash, 'PEGAWAI', id],
      );
      await tx.query('INSERT INTO team_members VALUES($1,$2,$3,2026,$4)', [
        randomUUID(),
        `team-${team + 1}`,
        id,
        i < 6,
      ]);
      for (let m = 1; m <= 9; m++)
        await tx.query(
          'INSERT INTO ckp_scores(id,employee_id,month,year,score,created_by) VALUES($1,$2,$3,2026,$4,$5)',
          [randomUUID(), id, m, roundSeed(79 + i * 0.8 + m * 0.6), 'user-admin'],
        );
    }
    const texts = [
      ['Saya menyusun prioritas pekerjaan sesuai target tim.', 'MANAJERIAL'],
      ['Saya menyelesaikan perbedaan pendapat secara konstruktif.', 'MANAJERIAL'],
      ['Saya membantu tim beradaptasi dengan perubahan.', 'MANAJERIAL'],
      ['Saya menerapkan metode statistik sesuai prosedur.', 'TEKNIS'],
      ['Saya memeriksa kualitas data sebelum publikasi.', 'TEKNIS'],
      ['Saya menggunakan perangkat pengolahan data secara mandiri.', 'TEKNIS'],
    ];
    for (let i = 0; i < texts.length; i++)
      await tx.query('INSERT INTO potential_questions VALUES($1,$2,$3,$4,$5,true)', [
        `question-${i + 1}`,
        'period-2026',
        ...texts[i],
        i + 1,
      ]);
    // Fictional, nonclinical development prompts. No diagnosis or clinical score is computed.
    await tx.query(
      `INSERT INTO psych_questions VALUES('psych-1','period-2026','Saya memiliki waktu yang cukup untuk beristirahat.','REFLEKSI',1,true),('psych-2','period-2026','Saya merasa dapat meminta dukungan saat menghadapi kesulitan pekerjaan.','REFLEKSI',2,true)`,
    );
    const questions = await tx.query<Question>('SELECT * FROM potential_questions');
    const [config] = await tx.query<ScoreConfig>('SELECT * FROM score_config');
    for (let i = 0; i < 10; i++) {
      const id = `emp-${i + 1}`,
        answers = Object.fromEntries(
          questions.map((q, j) => [q.id, Math.max(1, Math.min(5, 2 + ((i + j) % 4)))]),
        );
      const scores = potentialScore(questions, answers, config);
      await tx.query(`INSERT INTO potential_answers VALUES($1,'period-2026',$2,now(),now())`, [
        id,
        JSON.stringify(answers),
      ]);
      await tx.query(
        `INSERT INTO potential_scores(employee_id,period_id,managerial,technical,score,config_version) VALUES($1,'period-2026',$2,$3,$4,1)`,
        [id, scores.managerial, scores.technical, scores.score],
      );
      await tx.query(
        `INSERT INTO trainings VALUES($1,$2,'period-2026','Pelatihan pengolahan data (contoh)','Pelatihan','2026-04-15','Pusdiklat (contoh)',$3,null,true,'user-admin')`,
        [randomUUID(), id, 12 + i * 3],
      );
      // Only actual assigned leaders assess their members in development data.
      if (i >= 6)
        await tx.query(
          `INSERT INTO leader_assessments VALUES($1,'period-2026',$2,$3,$4,'Data contoh development',$5,now())`,
          [
            randomUUID(),
            id,
            `emp-${i - 5}`,
            JSON.stringify({
              'Kualitas pekerjaan': 80,
              'Kolaborasi tim': 85,
              'Tanggung jawab': 80,
              'Pemecahan masalah': 75,
            }),
            80,
          ],
        );
      await calculateEmployee(tx, id, 'period-2026');
    }
    await tx.query(
      `INSERT INTO audit_logs(id,actor_id,action,resource) VALUES($1,'user-super','DEVELOPMENT_SEED','system')`,
      [randomUUID()],
    );
  });
}
function roundSeed(v: number) {
  return Math.round(v * 10) / 10;
}
