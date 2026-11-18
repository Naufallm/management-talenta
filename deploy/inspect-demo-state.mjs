/* global console */
import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import pg from 'pg';
import { URL } from 'node:url';

const env = parse(await readFile('/home/bps/talenta-deploy-20261112/app/deploy/state/app.env'));
const connection = new URL(env.DATABASE_URL);
connection.searchParams.delete('options');
const db = new pg.Client({
  connectionString: connection.toString(),
  options: '-c search_path=management_talenta',
});
await db.connect();
try {
  console.log(
    JSON.stringify(
      {
        migrations: (await db.query('SELECT name FROM schema_migrations ORDER BY name')).rows,
        roster: (
          await db.query('SELECT active,count(*)::int AS total FROM employees GROUP BY active')
        ).rows,
        periods: (
          await db.query(`SELECT p.*,c.potential_threshold,c.competency_threshold,c.training_hours_target,c.achievement_points,
      (SELECT count(*)::int FROM potential_answers a WHERE a.period_id=p.id) AS potential_answers,
      (SELECT count(*)::int FROM potential_questions a WHERE a.period_id=p.id AND a.active) AS potential_questions,
      (SELECT count(*)::int FROM potential_scores a WHERE a.period_id=p.id) AS potential_scores,
      (SELECT count(*)::int FROM potential_dna_assessments a WHERE a.period_id=p.id) AS dna_answers,
      (SELECT count(*)::int FROM trainings a WHERE a.period_id=p.id) AS trainings,
      (SELECT count(*)::int FROM achievements a WHERE a.period_id=p.id) AS achievements,
      (SELECT count(*)::int FROM leader_assessments a WHERE a.period_id=p.id) AS leader_assessments,
      (SELECT count(*)::int FROM quadrant_results a WHERE a.period_id=p.id) AS quadrants,
      (SELECT count(*)::int FROM team_members tm WHERE tm.year=p.year) AS memberships
      FROM periods p LEFT JOIN score_config c ON c.period_id=p.id ORDER BY year DESC`)
        ).rows,
        teams: (await db.query('SELECT count(*)::int AS total FROM teams')).rows,
        scoreRanges: (
          await db.query(
            'SELECT period_id,min(potential) AS min_potential,max(potential) AS max_potential,min(competency) AS min_competency,max(competency) AS max_competency FROM quadrant_results GROUP BY period_id',
          )
        ).rows,
      },
      null,
      2,
    ),
  );
} finally {
  await db.end();
}
