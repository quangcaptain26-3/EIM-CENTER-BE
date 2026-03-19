-- migration: 20_trial_converted_integrity_guard.sql
-- Mục tiêu:
-- - Chặn set trial_leads.status = 'CONVERTED' nếu không có trial_conversions tương ứng.
-- - Bảo vệ integrity khi có thao tác SQL trực tiếp hoặc luồng nội bộ bypass application layer.

BEGIN;

CREATE OR REPLACE FUNCTION enforce_trial_converted_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ kiểm tra khi record ở trạng thái CONVERTED.
  IF NEW.status = 'CONVERTED' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM trial_conversions tc
      WHERE tc.trial_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'TRIAL_CONVERTED_WITHOUT_CONVERSION'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_trial_converted_integrity ON trial_leads;

CREATE CONSTRAINT TRIGGER trg_enforce_trial_converted_integrity
AFTER INSERT OR UPDATE OF status
ON trial_leads
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_trial_converted_integrity();

COMMIT;
