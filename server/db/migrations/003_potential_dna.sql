CREATE TABLE potential_dna_assessments (
 employee_id text NOT NULL REFERENCES employees(id),
 period_id text NOT NULL REFERENCES periods(id),
 instrument_version text NOT NULL,
 answers jsonb NOT NULL DEFAULT '{}',
 instructions_accepted_at timestamptz NOT NULL,
 submitted_at timestamptz,
 result jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(employee_id,period_id),
 CHECK ((submitted_at IS NULL AND result IS NULL) OR (submitted_at IS NOT NULL AND result IS NOT NULL))
);
