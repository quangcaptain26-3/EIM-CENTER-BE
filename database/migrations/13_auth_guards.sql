-- =============================================================================
-- EIM Migration 13: Auth Guards (last admin + salary log enforcement)
-- Depends on: 02_auth.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TRIGGER: Chặn xóa mềm/vô hiệu admin cuối cùng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_guard_last_admin_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_admin_count INT;
  v_role_code TEXT;
BEGIN
  SELECT r.code INTO v_role_code
  FROM roles r
  WHERE r.id = OLD.role_id;

  IF v_role_code = 'ADMIN' AND (
    (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) OR
    (OLD.is_active = true AND NEW.is_active = false)
  ) THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.code = 'ADMIN'
      AND u.deleted_at IS NULL
      AND u.is_active = true;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_ADMIN_DELETE: cannot remove the last active admin';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_last_admin_mutation ON users;
CREATE TRIGGER trg_guard_last_admin_mutation
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_guard_last_admin_mutation();

-- ---------------------------------------------------------------------------
-- TRIGGER: Mọi đổi lương phải có salary_change_logs tương ứng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_require_salary_change_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_log_exists BOOLEAN;
BEGIN
  IF
    OLD.salary_per_session IS DISTINCT FROM NEW.salary_per_session
    OR OLD.allowance IS DISTINCT FROM NEW.allowance
  THEN
    SELECT EXISTS (
      SELECT 1
      FROM salary_change_logs scl
      WHERE scl.user_id = NEW.id
        AND scl.old_salary_per_session IS NOT DISTINCT FROM OLD.salary_per_session
        AND scl.new_salary_per_session IS NOT DISTINCT FROM NEW.salary_per_session
        AND scl.old_allowance IS NOT DISTINCT FROM OLD.allowance
        AND scl.new_allowance IS NOT DISTINCT FROM NEW.allowance
        AND scl.changed_at >= now() - interval '10 minutes'
    ) INTO v_log_exists;

    IF NOT v_log_exists THEN
      RAISE EXCEPTION 'SALARY_CHANGE_LOG_REQUIRED: salary update must have salary_change_logs entry';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_require_salary_change_log ON users;
CREATE TRIGGER trg_require_salary_change_log
  AFTER UPDATE OF salary_per_session, allowance ON users
  FOR EACH ROW EXECUTE FUNCTION fn_require_salary_change_log();
