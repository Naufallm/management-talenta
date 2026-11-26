import { periodDnaQuestions, dnaQuestionRevision } from './dna-questions.ts';
import { dnaQuestions, dnaAspects } from './dna-instrument.ts';
import {
  dnaVersion,
  dnaScoringVersion,
  dnaComposition,
  dnaClusters,
  dnaClusterInfo,
  dnaFormations,
  dnaLevelValues,
  type DnaResult,
  type DnaCluster,
} from '../../shared/potential-dna.ts';
import { assert } from '../errors.ts';
import type { DB } from '../db/index.ts';

const round = (value: number) => Math.round(value * 100) / 100;
export function validateDnaAnswers(answers: Record<string, number>, complete = false) {
  const keys = Object.keys(answers);
  assert(
    keys.every((id) => dnaQuestions.some((q) => q.id === id)),
    422,
    'Jawaban memuat soal yang tidak berlaku.',
  );
  assert(
    keys.every((id) => Number.isInteger(answers[id]) && answers[id] >= 0 && answers[id] <= 100),
    422,
    'Nilai jawaban harus bilangan bulat 0–100.',
  );
  assert(
    dnaQuestions.slice(0, keys.length).every((q) => answers[q.id] !== undefined),
    422,
    'Jawab pernyataan secara berurutan tanpa melewati soal sebelumnya.',
  );
  assert(!complete || keys.length === 30, 422, 'Lengkapi seluruh 30 pernyataan sebelum mengirim.');
}
export function calculateDna(answers: Record<string, number>, questions = dnaQuestions): DnaResult {
  validateDnaAnswers(answers, true);
  const scores = Object.fromEntries(
    dnaClusters.map((cluster) => [
      cluster,
      round(
        dnaQuestions
          .filter((q) => q.cluster === cluster)
          .reduce((sum, q) => sum + answers[q.id], 0) / 10,
      ),
    ]),
  ) as Record<DnaCluster, number>;
  const highest = Math.max(...Object.values(scores));
  const dominant = dnaClusters.filter((cluster) => scores[cluster] === highest);
  const explanations = Object.fromEntries(
    dnaClusters.map((cluster) => [
      cluster,
      `${dnaClusterInfo[cluster].name} memperoleh rata-rata persetujuan ${scores[cluster]} dari 100 pada 10 pernyataan. ${dnaClusterInfo[cluster].description}${dominant.includes(cluster) ? (dominant.length === 1 ? ' Ini merupakan skor klaster tertinggi pada jawaban Anda.' : ' Skor ini setara dengan klaster tertinggi lainnya; profil Anda memiliki kecenderungan gabungan.') : ' Klaster ini melengkapi kecenderungan utama Anda.'}`,
    ]),
  ) as Record<DnaCluster, string>;
  const highlights = Object.fromEntries(
    dnaClusters.map((cluster) => [
      cluster,
      questions
        .filter((q) => q.cluster === cluster)
        .map((q) => ({ number: q.number, text: q.text, value: answers[q.id] }))
        .sort((a, b) => b.value - a.value || a.number - b.number)
        .slice(0, 2),
    ]),
  ) as NonNullable<DnaResult['highlights']>;
  const formations = dnaFormations
    .map((formation, index) => {
      const aspects = dnaAspects.map((aspect) => {
        const actual =
          aspect.numbers.reduce((sum, n) => sum + answers[dnaQuestions[n - 1].id], 0) / 2;
        const level = aspect.ideals[index],
          ideal = dnaLevelValues[level];
        return {
          name: aspect.name,
          detail: aspect.detail,
          numbers: aspect.numbers,
          actual,
          ideal,
          level,
          gap: ideal - actual,
        };
      });
      const byGap = [...aspects].sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));
      return {
        ...formation,
        rank: 0,
        match: round(100 - aspects.reduce((sum, a) => sum + Math.abs(a.gap), 0) / aspects.length),
        aspects,
        strengths: byGap
          .filter((a) => Math.abs(a.gap) <= 25)
          .slice(0, 3)
          .map((a) => a.name),
        development: [...byGap]
          .reverse()
          .filter((a) => Math.abs(a.gap) > 25)
          .slice(0, 2)
          .map((a) => a.name),
      };
    })
    .sort((a, b) => b.match - a.match);
  formations.forEach((formation, index) => {
    formation.rank =
      index > 0 && formation.match === formations[index - 1].match
        ? formations[index - 1].rank
        : index + 1;
  });
  return {
    version: dnaScoringVersion,
    scores,
    composition: dnaComposition(scores),
    dominant,
    explanations,
    highlights,
    formations,
  };
}
export async function readDna(db: DB, periodId: string, employeeId: string) {
  const [row] = await db.query(
    'SELECT * FROM potential_dna_assessments WHERE period_id=$1 AND employee_id=$2',
    [periodId, employeeId],
  );
  const questions: typeof dnaQuestions =
    row?.question_snapshot || (await periodDnaQuestions(db, periodId));
  return {
    version: row?.instrument_version || dnaVersion,
    question_revision: dnaQuestionRevision(questions),
    questions,
    answers: row?.answers || {},
    instructions_accepted_at: row?.instructions_accepted_at || null,
    submitted_at: row?.submitted_at || null,
    updated_at: row?.updated_at || null,
    result: row?.submitted_at ? calculateDna(row.answers, questions) : null,
  };
}
