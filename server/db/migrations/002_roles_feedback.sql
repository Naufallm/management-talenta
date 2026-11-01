ALTER TABLE users DROP CONSTRAINT users_role_check;
UPDATE users SET role='ADMIN' WHERE role='SUPER_ADMIN';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','SUPERVISOR','PEGAWAI'));
CREATE TABLE employee_feedback (
 id text PRIMARY KEY,
 employee_id text NOT NULL REFERENCES employees(id),
 author_id text NOT NULL REFERENCES users(id),
 content text NOT NULL CHECK (length(content) BETWEEN 3 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_feedback_employee_date ON employee_feedback(employee_id,created_at DESC);
