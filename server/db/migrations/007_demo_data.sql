ALTER TABLE periods ADD COLUMN demo_data boolean NOT NULL DEFAULT false;
CREATE TABLE demo_data_batches (
 id text PRIMARY KEY,
 period_id text NOT NULL UNIQUE REFERENCES periods(id),
 manifest jsonb NOT NULL,
 created_by text NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
