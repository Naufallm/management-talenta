ALTER TABLE users ADD COLUMN additional_roles text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD CONSTRAINT additional_roles_valid CHECK (additional_roles <@ ARRAY['ADMIN','SUPERVISOR','PEGAWAI']::text[]);
ALTER TABLE sessions ADD COLUMN active_role text CHECK (active_role IN ('ADMIN','SUPERVISOR','PEGAWAI'));
ALTER TABLE trainings ADD COLUMN place text NOT NULL DEFAULT '';
ALTER TABLE trainings ADD COLUMN updated_at timestamptz;
ALTER TABLE achievements ADD COLUMN updated_at timestamptz;
CREATE TABLE formal_education (
 id text PRIMARY KEY,
 employee_id text NOT NULL REFERENCES employees(id),
 level text NOT NULL,
 study_program text NOT NULL,
 diploma_date date NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX formal_education_employee ON formal_education(employee_id,diploma_date DESC);
