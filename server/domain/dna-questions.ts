import { createHash } from 'node:crypto';
import type { DB } from '../db/index.ts';
import { dnaQuestions } from './dna-instrument.ts';
export async function periodDnaQuestions(db: DB, periodId: string) {
  const rows = await db.query(
    'SELECT question_id,text FROM potential_dna_questions WHERE period_id=$1',
    [periodId],
  );
  const text = new Map(rows.map((row) => [row.question_id, row.text as string]));
  return dnaQuestions.map((question) => ({
    ...question,
    text: text.get(question.id) || question.text,
  }));
}
export const dnaQuestionRevision = (questions: readonly { id: string; text: string }[]) =>
  createHash('sha256')
    .update(JSON.stringify(questions.map((q) => [q.id, q.text])))
    .digest('hex');
