-- =============================================================================
-- EIM Migration 11: Business Triggers & Constraints
-- Depends on: tất cả migrations trước
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TRIGGER: Guard tuition_fee bất biến sau khi paid_at != NULL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_guard_tuition_fee()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.tuition_fee IS DISTINCT FROM NEW.tuition_fee
     AND OLD.paid_at IS NOT NULL THEN
    RAISE EXCEPTION
      'IMMUTABLE: tuition_fee cannot be changed after payment (enrollment %)', OLD.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_tuition_fee
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_guard_tuition_fee();

-- ---------------------------------------------------------------------------
-- TRIGGER: Guard class capacity — không vượt max_capacity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_guard_class_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count INT;
  v_max   INT;
BEGIN
  IF NEW.status IN ('trial', 'active') THEN
    SELECT COUNT(*) INTO v_count
    FROM enrollments
    WHERE class_id = NEW.class_id
      AND status IN ('trial', 'active')
      AND id != NEW.id;

    SELECT max_capacity INTO v_max
    FROM classes WHERE id = NEW.class_id;

    IF v_count >= v_max THEN
      RAISE EXCEPTION
        'CLASS_CAPACITY_EXCEEDED: class % is full (max %)', NEW.class_id, v_max;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_class_capacity
  BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_guard_class_capacity();

-- ---------------------------------------------------------------------------
-- TRIGGER: Sync sessions_attended + sessions_absent khi attendance thay đổi
-- Chạy AFTER INSERT/UPDATE/DELETE để đảm bảo tính toán chính xác
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_attendance_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_enrollment_id UUID;
BEGIN
  v_enrollment_id := COALESCE(NEW.enrollment_id, OLD.enrollment_id);

  UPDATE enrollments SET
    sessions_attended = (
      SELECT COUNT(*) FROM attendance
      WHERE enrollment_id = v_enrollment_id
        AND status IN ('present', 'late')
    ),
    sessions_absent = (
      SELECT COUNT(*) FROM attendance
      WHERE enrollment_id = v_enrollment_id
        AND status IN ('absent_excused', 'absent_unexcused')
    )
  WHERE id = v_enrollment_id;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_sync_attendance
  AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_sync_attendance_counts();

-- ---------------------------------------------------------------------------
-- TRIGGER: Set makeup_blocked = true khi vắng không phép >= 3 lần
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_makeup_blocked()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_unexcused INT;
BEGIN
  IF NEW.status = 'absent_unexcused' THEN
    SELECT COUNT(*) INTO v_unexcused
    FROM attendance
    WHERE enrollment_id = NEW.enrollment_id
      AND status = 'absent_unexcused';

    IF v_unexcused >= 3 THEN
      UPDATE enrollments
      SET makeup_blocked = true
      WHERE id = NEW.enrollment_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_check_makeup_blocked
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_check_makeup_blocked();

-- ---------------------------------------------------------------------------
-- TRIGGER: Ngăn DELETE receipts
-- Nguyên tắc tài chính: phiếu thu là IMMUTABLE — hoàn tiền = tạo phiếu âm mới
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_receipt_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'IMMUTABLE: receipts cannot be deleted. Create a void receipt instead.';
END $$;

CREATE TRIGGER trg_prevent_receipt_delete
  BEFORE DELETE ON receipts
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_receipt_delete();

-- ---------------------------------------------------------------------------
-- TRIGGER: Ngăn UPDATE/DELETE audit_logs (append-only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'IMMUTABLE: audit_logs are append-only. No UPDATE or DELETE allowed.';
END $$;

CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_mutation();

CREATE TRIGGER trg_prevent_audit_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_mutation();

-- ---------------------------------------------------------------------------
-- CONSTRAINT: class_transfer_count tối đa 1 (theo CLASS_RULES.MAX_TRANSFERS)
-- ---------------------------------------------------------------------------
ALTER TABLE enrollments
  ADD CONSTRAINT chk_max_transfers
  CHECK (class_transfer_count <= 1);
