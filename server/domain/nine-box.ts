import type { DB } from '../db/index.ts';
import { getPeriod } from '../http.ts';
import {
  awardPoints,
  calculateNineBox,
  defaultNineBoxConfig,
  type NineBoxResponse,
  type NineBoxInput,
} from '../../shared/nine-box.ts';
import { calculateDna } from './potential-dna.ts';
import { nineBoxConfigSchema } from '../../shared/nine-box-validation.ts';
export const emptyNineBoxInput: NineBoxInput = {
  assessment_score: null,
  assessment_source: '',
  assessment_date: null,
  education_level: null,
  field_match: null,
  field_match_note: '',
};
export async function getNineBoxConfig(db: DB, periodId: string) {
  const [stored] = await db.query(
    'SELECT settings,version FROM nine_box_config WHERE period_id=$1',
    [periodId],
  );
  return {
    config: stored
      ? nineBoxConfigSchema.parse(stored.settings)
      : structuredClone(defaultNineBoxConfig),
    version: stored?.version || 1,
  };
}
export async function nineBoxDataset(
  db: DB,
  periodId: string,
  employeeId = '',
  team = '',
  now = new Date(),
): Promise<NineBoxResponse> {
  const period = await getPeriod(db, periodId);
  const { config, version } = await getNineBoxConfig(db, periodId);
  // Use Asia/Jakarta calendar months; current-year future CKP months do not enter the average.
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [currentYear, currentMonth] = today.split('-').map(Number);
  const month = period.year < currentYear ? 12 : period.year === currentYear ? currentMonth : 0;
  const cutoff =
    period.year < currentYear
      ? `${period.year}-12-31`
      : period.year === currentYear
        ? today
        : `${period.year}-01-01`;
  const people = await db.query(
    `SELECT e.id,e.name,e.nip,e.unit FROM employees e WHERE e.active AND ($1='' OR e.id=$1) AND ($2='' OR EXISTS(SELECT 1 FROM team_members tm WHERE tm.employee_id=e.id AND tm.team_id=$2 AND tm.year=$3)) ORDER BY e.name,e.id`,
    [employeeId, team, period.year],
  );
  const ids = people.map((e) => e.id);
  const [training, awards, leaders, experience, ckp, inputs, dna] = await Promise.all([
    db.query(
      'SELECT employee_id,sum(hours)::real AS hours,count(job_match)::int AS reviewed,count(*)::int AS eligible,avg(job_match::int * 10)::real AS relevance FROM trainings WHERE period_id=$1 AND employee_id=ANY($2::text[]) AND verified AND activity_date<=$3 GROUP BY employee_id',
      [periodId, ids, cutoff],
    ),
    db.query(
      'SELECT employee_id,award_level,award_scope FROM achievements WHERE period_id=$1 AND employee_id=ANY($2::text[]) AND verified AND activity_date<=$3',
      [periodId, ids, cutoff],
    ),
    db.query(
      'SELECT employee_id,avg(score)::real AS score FROM leader_assessments WHERE period_id=$1 AND employee_id=ANY($2::text[]) AND submitted_at IS NOT NULL GROUP BY employee_id',
      [periodId, ids],
    ),
    db.query(
      'SELECT employee_id,max(CASE WHEN is_leader THEN 20 ELSE 5 END) AS points FROM team_members WHERE year=$1 AND employee_id=ANY($2::text[]) GROUP BY employee_id',
      [period.year, ids],
    ),
    db.query(
      'SELECT employee_id,avg(score)::real AS score,count(*)::int AS months FROM ckp_scores WHERE year=$1 AND month<=$3 AND employee_id=ANY($2::text[]) GROUP BY employee_id',
      [period.year, ids, month],
    ),
    db.query('SELECT * FROM nine_box_inputs WHERE period_id=$1 AND employee_id=ANY($2::text[])', [
      periodId,
      ids,
    ]),
    config.assessment_source === 'DNA'
      ? db.query(
          'SELECT employee_id,answers FROM potential_dna_assessments WHERE period_id=$1 AND employee_id=ANY($2::text[]) AND submitted_at IS NOT NULL',
          [periodId, ids],
        )
      : Promise.resolve([]),
  ]);
  const index = (rows: Record<string, any>[]) => new Map(rows.map((r) => [r.employee_id, r]));
  const trainingMap = index(training),
    leaderMap = index(leaders),
    experienceMap = index(experience),
    ckpMap = index(ckp),
    inputMap = index(inputs),
    dnaMap = index(dna);
  const rows = people.map((e) => {
    const input = inputMap.get(e.id);
    let assessment = input?.assessment_score ?? null;
    if (config.assessment_source === 'DNA') {
      const source = dnaMap.get(e.id);
      if (source) {
        calculateDna(source.answers);
        assessment =
          Object.values(source.answers as Record<string, number>).reduce((a, b) => a + b, 0) / 30;
      } else assessment = null;
    }
    const employeeAwards = awards.filter((a) => a.employee_id === e.id);
    const courses = trainingMap.get(e.id);
    // Keep the historical review until the first eligible course is rated individually.
    const historicalMatch = input?.field_match == null ? null : input.field_match ? 10 : 0;
    const relevance = courses?.reviewed
      ? courses.reviewed === courses.eligible
        ? courses.relevance
        : null
      : historicalMatch;
    const result = calculateNineBox(
      {
        training_hours: Number(trainingMap.get(e.id)?.hours || 0),
        experience_points: Number(experienceMap.get(e.id)?.points || 0),
        assessment,
        education: input?.education_level
          ? config.education_scores[input.education_level as keyof typeof config.education_scores]
          : null,
        field_match: relevance,
        ckp: ckpMap.get(e.id)?.score ?? null,
        award_points: employeeAwards
          .filter((a) => a.award_level && a.award_scope)
          .map((a) => awardPoints(a.award_level, a.award_scope)),
        unclassified_awards: employeeAwards.filter((a) => !a.award_level || !a.award_scope).length,
        leader: leaderMap.get(e.id)?.score ?? null,
      },
      config,
    );
    return { employee_id: e.id, name: e.name, nip: e.nip, unit: e.unit, ...result };
  });
  return {
    period: { id: period.id, year: period.year, name: period.name, status: period.status },
    config,
    config_version: version,
    rows,
    total: rows.length,
    complete: rows.filter((r) => r.box !== null).length,
    as_of: cutoff,
  };
}
