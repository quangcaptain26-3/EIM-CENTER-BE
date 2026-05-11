-- =============================================================================
-- EIM Migration 15: Enrollment lifecycle hardening
-- =============================================================================

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS reservation_fee DECIMAL(12,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pause_count SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS chk_max_transfers;

ALTER TABLE enrollments
  ADD CONSTRAINT chk_max_transfers CHECK (class_transfer_count <= 1),
  ADD CONSTRAINT chk_pause_count CHECK (pause_count <= 1),
  ADD CONSTRAINT chk_reservation_fee_non_negative CHECK (reservation_fee >= 0);

ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS enrollments_status_check;

ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN (
    'reserved','pending','trial','active','paused',
    'transferred','dropped','completed'
  ));

CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config(key, value)
VALUES ('trial_sessions_limit', '2')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION fn_guard_active_trial_duplicate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('trial', 'active') THEN
    IF EXISTS (
      SELECT 1
      FROM enrollments e
      WHERE e.class_id = NEW.class_id
        AND e.student_id = NEW.student_id
        AND e.status IN ('trial', 'active')
        AND e.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'ENROLLMENT_DUPLICATE_ACTIVE_TRIAL_IN_CLASS';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_active_trial_duplicate ON enrollments;
CREATE TRIGGER trg_guard_active_trial_duplicate
  BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_guard_active_trial_duplicate();

CREATE TABLE IF NOT EXISTS program_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  old_enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  new_enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  old_program_id UUID NOT NULL REFERENCES programs(id),
  new_program_id UUID NOT NULL REFERENCES programs(id),
  credit_amount DECIMAL(12,0) NOT NULL,
  additional_fee DECIMAL(12,0) NOT NULL,
  requested_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'rejected')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ;
