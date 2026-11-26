UPDATE periods SET status='CLOSED' WHERE status='DRAFT';
ALTER TABLE periods DROP CONSTRAINT periods_status_check;
ALTER TABLE periods ADD CONSTRAINT periods_status_check CHECK (status IN ('OPEN','CLOSED'));
