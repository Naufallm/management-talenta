CREATE TABLE potential_dna_questions (
 period_id text NOT NULL REFERENCES periods(id),
 question_id text NOT NULL,
 text text NOT NULL CHECK(length(trim(text)) BETWEEN 5 AND 2000),
 updated_by text NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(period_id,question_id)
);
ALTER TABLE potential_dna_assessments ADD COLUMN question_snapshot jsonb;
