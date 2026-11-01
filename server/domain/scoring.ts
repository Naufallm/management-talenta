import type { ScoreConfig, Question, Quadrant } from '../../shared/contracts.ts';
import { assert } from '../errors.ts';
import type { DB } from '../db/index.ts';
export const round = (value: number) => Math.round(value * 100) / 100;
export function potentialScore(
  questions: Question[],
  answers: Record<string, number>,
  config: ScoreConfig,
) {
  const average = (category: string) => {
    const items = questions.filter((q) => q.category === category);
    assert(items.length > 0, 422, `Bank soal ${category.toLowerCase()} belum lengkap.`);
    assert(
      items.every(
        (q) => Number.isInteger(answers[q.id]) && answers[q.id] >= 1 && answers[q.id] <= 5,
      ),
      422,
      'Lengkapi semua jawaban sebelum mengirim.',
    );
    return round(items.reduce((sum, q) => sum + (answers[q.id] - 1) * 25, 0) / items.length);
  };
  const managerial = average('MANAJERIAL'),
    technical = average('TEKNIS');
  return {
    managerial,
    technical,
    score: round(
      (managerial * config.managerial_weight + technical * config.technical_weight) / 100,
    ),
  };
}
export function quadrant(
  potential: number,
  competency: number,
  config: Pick<ScoreConfig, 'potential_threshold' | 'competency_threshold'>,
): Quadrant {
  return competency >= config.competency_threshold
    ? potential >= config.potential_threshold
      ? 'Talenta Unggul'
      : 'Profesional Andal'
    : potential >= config.potential_threshold
      ? 'Talenta Berkembang'
      : 'Perlu Pengembangan';
}
export async function calculateEmployee(db: DB, employeeId: string, periodId: string) {
  const [config] = await db.query<ScoreConfig>('SELECT * FROM score_config WHERE period_id=$1', [
    periodId,
  ]);
  const [potential] = await db.query(
    'SELECT * FROM potential_scores WHERE employee_id=$1 AND period_id=$2',
    [employeeId, periodId],
  );
  const [training] = await db.query(
    'SELECT COALESCE(sum(hours),0)::real AS hours FROM trainings WHERE employee_id=$1 AND period_id=$2 AND verified',
    [employeeId, periodId],
  );
  const [achievement] = await db.query(
    'SELECT count(*)::int AS total FROM achievements WHERE employee_id=$1 AND period_id=$2 AND verified',
    [employeeId, periodId],
  );
  const evidence = round(
    Math.min(
      100,
      (Number(training.hours) / config.training_hours_target) * 100 +
        achievement.total * config.achievement_points,
    ),
  );
  const [assessment] = await db.query(
    'SELECT avg(score)::real AS score FROM leader_assessments WHERE employee_id=$1 AND period_id=$2 AND submitted_at IS NOT NULL',
    [employeeId, periodId],
  );
  const leader = assessment.score === null ? null : Number(assessment.score);
  const score =
    leader === null && config.leader_weight > 0
      ? null
      : round((evidence * config.evidence_weight + (leader ?? 0) * config.leader_weight) / 100);
  await db.query(
    `INSERT INTO competency_scores(employee_id,period_id,evidence,leader,score,config_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(employee_id,period_id) DO UPDATE SET evidence=$3,leader=$4,score=$5,config_version=$6,calculated_at=now()`,
    [employeeId, periodId, evidence, leader, score, config.version],
  );
  if (potential && score !== null)
    await db.query(
      `INSERT INTO quadrant_results(employee_id,period_id,potential,competency,quadrant,config_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(employee_id,period_id) DO UPDATE SET potential=$3,competency=$4,quadrant=$5,config_version=$6,calculated_at=now()`,
      [
        employeeId,
        periodId,
        potential.score,
        score,
        quadrant(potential.score, score, config),
        config.version,
      ],
    );
  else
    await db.query('DELETE FROM quadrant_results WHERE employee_id=$1 AND period_id=$2', [
      employeeId,
      periodId,
    ]);
}
