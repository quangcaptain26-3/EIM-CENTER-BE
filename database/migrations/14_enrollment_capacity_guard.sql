-- migration: 14_enrollment_capacity_guard.sql
-- Mục tiêu: chống race condition vượt capacity khi add/transfer enrollment vào class.
-- Chiến lược: dùng trigger BEFORE INSERT/UPDATE trên enrollments.
-- - Lock row của classes bằng FOR UPDATE để serialize các thao tác cùng class.
-- - Nếu số lượng ACTIVE >= capacity thì chặn.
-- - Throw với ERRCODE 'P0001' để backend map thành 400 thay vì 500.

BEGIN;

CREATE OR REPLACE FUNCTION enforce_class_capacity_guard()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INT;
  v_active_count INT;
BEGIN
  -- Chỉ kiểm tra khi có class_id và trạng thái ACTIVE.
  IF NEW.class_id IS NULL OR NEW.status <> 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  -- Lock class row để tránh race condition.
  SELECT capacity
  INTO v_capacity
  FROM classes
  WHERE id = NEW.class_id
  FOR UPDATE;

  IF v_capacity IS NULL THEN
    -- class_id không tồn tại (FK có thể được add ở migration khác), chặn mềm.
    RAISE EXCEPTION 'CLASS_NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;

  -- Đếm số ACTIVE trong class (loại trừ chính row đang update).
  SELECT COUNT(*)::INT
  INTO v_active_count
  FROM enrollments e
  WHERE e.class_id = NEW.class_id
    AND e.status = 'ACTIVE'
    AND (TG_OP <> 'UPDATE' OR e.id <> NEW.id);

  IF v_active_count >= v_capacity THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_EXCEEDED'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_class_capacity_guard ON enrollments;

CREATE TRIGGER trg_enforce_class_capacity_guard
BEFORE INSERT OR UPDATE OF class_id, status
ON enrollments
FOR EACH ROW
EXECUTE FUNCTION enforce_class_capacity_guard();

COMMIT;

