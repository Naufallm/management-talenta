CREATE TABLE employees (
 id text PRIMARY KEY, nip varchar(18) UNIQUE NOT NULL CHECK (nip ~ '^[0-9]{18}$'),
 name text NOT NULL, position text NOT NULL, grade text NOT NULL, unit text NOT NULL,
 email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
 id text PRIMARY KEY, username text UNIQUE NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','PEGAWAI')),
 employee_id text UNIQUE REFERENCES employees(id), active boolean NOT NULL DEFAULT true,
 must_change_password boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (role <> 'PEGAWAI' OR employee_id IS NOT NULL)
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf_token text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE teams (id text PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE periods (
 id text PRIMARY KEY, year integer NOT NULL UNIQUE CHECK (year BETWEEN 2020 AND 2100),
 name text NOT NULL, starts_on date NOT NULL, ends_on date NOT NULL,
 status text NOT NULL CHECK (status IN ('DRAFT','OPEN','CLOSED')), CHECK (ends_on >= starts_on)
);
CREATE UNIQUE INDEX one_open_period ON periods(status) WHERE status='OPEN';
CREATE TABLE team_members (
 id text PRIMARY KEY, team_id text NOT NULL REFERENCES teams(id), employee_id text NOT NULL REFERENCES employees(id),
 year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100), is_leader boolean NOT NULL DEFAULT false,
 UNIQUE(team_id,employee_id,year)
);
CREATE UNIQUE INDEX one_leader_per_team_year ON team_members(team_id,year) WHERE is_leader;
CREATE TABLE score_config (
 period_id text PRIMARY KEY REFERENCES periods(id), managerial_weight real NOT NULL DEFAULT 50,
 technical_weight real NOT NULL DEFAULT 50, evidence_weight real NOT NULL DEFAULT 50, leader_weight real NOT NULL DEFAULT 50,
 potential_threshold real NOT NULL DEFAULT 50, competency_threshold real NOT NULL DEFAULT 50,
 training_hours_target real NOT NULL DEFAULT 40, achievement_points real NOT NULL DEFAULT 10,
 employee_uploads boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
 CHECK (managerial_weight BETWEEN 0 AND 100 AND technical_weight BETWEEN 0 AND 100 AND managerial_weight+technical_weight=100),
 CHECK (evidence_weight BETWEEN 0 AND 100 AND leader_weight BETWEEN 0 AND 100 AND evidence_weight+leader_weight=100),
 CHECK (potential_threshold BETWEEN 1 AND 99 AND competency_threshold BETWEEN 1 AND 99),
 CHECK (training_hours_target > 0 AND achievement_points BETWEEN 0 AND 100)
);
CREATE TABLE potential_questions (
 id text PRIMARY KEY, period_id text NOT NULL REFERENCES periods(id), text text NOT NULL,
 category text NOT NULL CHECK (category IN ('MANAJERIAL','TEKNIS')), sort_order integer NOT NULL DEFAULT 1,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE potential_answers (
 employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 answers jsonb NOT NULL DEFAULT '{}', submitted_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(employee_id,period_id)
);
CREATE TABLE potential_scores (
 employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 managerial real NOT NULL CHECK (managerial BETWEEN 0 AND 100), technical real NOT NULL CHECK (technical BETWEEN 0 AND 100),
 score real NOT NULL CHECK (score BETWEEN 0 AND 100), config_version integer NOT NULL,
 calculated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(employee_id,period_id)
);
CREATE TABLE documents (
 id text PRIMARY KEY, employee_id text NOT NULL REFERENCES employees(id), name text NOT NULL,
 mime text NOT NULL, contents bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE trainings (
 id text PRIMARY KEY, employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 name text NOT NULL, activity_type text NOT NULL, activity_date date NOT NULL, organizer text NOT NULL,
 hours real NOT NULL CHECK (hours BETWEEN 0 AND 10000), document_id text REFERENCES documents(id),
 verified boolean NOT NULL DEFAULT false, created_by text NOT NULL REFERENCES users(id)
);
CREATE TABLE achievements (
 id text PRIMARY KEY, employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 name text NOT NULL, activity_type text NOT NULL, activity_date date NOT NULL, organizer text NOT NULL,
 hours real NOT NULL DEFAULT 0 CHECK (hours BETWEEN 0 AND 10000), document_id text REFERENCES documents(id),
 verified boolean NOT NULL DEFAULT false, created_by text NOT NULL REFERENCES users(id)
);
CREATE TABLE leader_assessments (
 id text PRIMARY KEY, period_id text NOT NULL REFERENCES periods(id), employee_id text NOT NULL REFERENCES employees(id),
 leader_id text NOT NULL REFERENCES employees(id), indicators jsonb NOT NULL DEFAULT '{}', note text NOT NULL DEFAULT '',
 score real CHECK (score BETWEEN 0 AND 100), submitted_at timestamptz, UNIQUE(period_id,employee_id,leader_id)
);
CREATE TABLE competency_scores (
 employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 evidence real NOT NULL CHECK (evidence BETWEEN 0 AND 100), leader real CHECK (leader BETWEEN 0 AND 100),
 score real CHECK (score BETWEEN 0 AND 100), config_version integer NOT NULL,
 calculated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(employee_id,period_id)
);
CREATE TABLE ckp_scores (
 id text PRIMARY KEY, employee_id text NOT NULL REFERENCES employees(id), month integer NOT NULL CHECK(month BETWEEN 1 AND 12),
 year integer NOT NULL CHECK(year BETWEEN 2020 AND 2100), score real NOT NULL CHECK(score BETWEEN 0 AND 100),
 created_by text NOT NULL REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(employee_id,month,year)
);
CREATE TABLE quadrant_results (
 employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 potential real NOT NULL CHECK (potential BETWEEN 0 AND 100), competency real NOT NULL CHECK (competency BETWEEN 0 AND 100),
 quadrant text NOT NULL CHECK (quadrant IN ('Talenta Unggul','Profesional Andal','Perlu Pengembangan','Talenta Berkembang')),
 config_version integer NOT NULL, calculated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(employee_id,period_id)
);
CREATE TABLE psych_questions (
 id text PRIMARY KEY, period_id text NOT NULL REFERENCES periods(id), text text NOT NULL,
 category text NOT NULL DEFAULT 'REFLEKSI', sort_order integer NOT NULL DEFAULT 1, active boolean NOT NULL DEFAULT true
);
CREATE TABLE psych_answers (
 employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 encrypted_answers text NOT NULL, submitted_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(employee_id,period_id)
);
CREATE TABLE psych_results (
 employee_id text NOT NULL REFERENCES employees(id), period_id text NOT NULL REFERENCES periods(id),
 encrypted_result text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(employee_id,period_id)
);
CREATE TABLE audit_logs (
 id text PRIMARY KEY, actor_id text REFERENCES users(id), action text NOT NULL, resource text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_search ON employees(lower(name));
CREATE INDEX team_members_year ON team_members(employee_id,year);
CREATE INDEX ckp_year_employee ON ckp_scores(year,employee_id);
CREATE INDEX audit_created ON audit_logs(created_at DESC);
