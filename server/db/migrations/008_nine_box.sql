CREATE TABLE nine_box_config (
 period_id text PRIMARY KEY REFERENCES periods(id),
 settings jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE nine_box_inputs (
 employee_id text NOT NULL REFERENCES employees(id),
 period_id text NOT NULL REFERENCES periods(id),
 assessment_score real CHECK(assessment_score BETWEEN 0 AND 100),
 assessment_source text NOT NULL DEFAULT '',
 assessment_date date,
 education_level text CHECK(education_level IN ('SD','SMP','SMA','D1','D2','D3','D4/S1','S2','S3')),
 field_match boolean,
 field_match_note text NOT NULL DEFAULT '',
 updated_by text NOT NULL REFERENCES users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(employee_id,period_id),
 CHECK(assessment_score IS NULL OR (length(trim(assessment_source))>=3 AND assessment_date IS NOT NULL)),
 CHECK(field_match IS NULL OR length(trim(field_match_note))>=3)
);
ALTER TABLE achievements ADD COLUMN award_level text CHECK(award_level IN ('CITY','PROVINCE','NATIONAL'));
ALTER TABLE achievements ADD COLUMN award_scope text CHECK(award_scope IN ('INTERNAL','EXTERNAL'));
ALTER TABLE achievements ADD CONSTRAINT award_classification_pair CHECK((award_level IS NULL)=(award_scope IS NULL));
