CREATE TABLE employee_photos (
 employee_id text PRIMARY KEY REFERENCES employees(id),
 contents bytea NOT NULL,
 version text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
