-- Mô tả: Ràng buộc vai trò giáo viên trên sessions/class_staff (functions + triggers).

SET client_encoding = 'UTF8';

BEGIN;

CREATE OR REPLACE FUNCTION assert_teacher_role(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM auth_user_roles ur
    JOIN auth_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND r.code = 'TEACHER'
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION trg_enforce_sessions_teacher_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.main_teacher_id IS NOT NULL AND NOT assert_teacher_role(NEW.main_teacher_id) THEN
    RAISE EXCEPTION 'MAIN_TEACHER_ROLE_INVALID'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.cover_teacher_id IS NOT NULL AND NOT assert_teacher_role(NEW.cover_teacher_id) THEN
    RAISE EXCEPTION 'COVER_TEACHER_ROLE_INVALID'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_sessions_teacher_roles ON sessions;
CREATE TRIGGER trg_enforce_sessions_teacher_roles
BEFORE INSERT OR UPDATE OF main_teacher_id, cover_teacher_id
ON sessions
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_sessions_teacher_roles();

CREATE OR REPLACE FUNCTION trg_enforce_class_staff_teacher_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT assert_teacher_role(NEW.user_id) THEN
    RAISE EXCEPTION 'CLASS_STAFF_ROLE_INVALID'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_class_staff_teacher_role ON class_staff;
CREATE TRIGGER trg_enforce_class_staff_teacher_role
BEFORE INSERT OR UPDATE OF user_id
ON class_staff
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_class_staff_teacher_role();

CREATE OR REPLACE FUNCTION trg_enforce_session_type_milestone()
RETURNS TRIGGER AS $$
DECLARE
  v_total_units INT;
  v_midterm_unit INT;
BEGIN
  SELECT cp.total_units
  INTO v_total_units
  FROM classes c
  JOIN curriculum_programs cp ON cp.id = c.program_id
  WHERE c.id = NEW.class_id;

  IF v_total_units IS NULL THEN
    RAISE EXCEPTION 'PROGRAM_NOT_FOUND_FOR_CLASS'
      USING ERRCODE = 'P0001';
  END IF;

  v_midterm_unit := GREATEST(1, FLOOR(v_total_units / 2.0));

  IF NEW.session_type = 'TEST' THEN
    IF NEW.unit_no <> 2 OR NEW.lesson_no <> 0 THEN
      RAISE EXCEPTION 'SESSION_TYPE_MILESTONE_INVALID'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.session_type = 'MIDTERM' THEN
    IF NEW.unit_no <> v_midterm_unit OR NEW.lesson_no <> 0 THEN
      RAISE EXCEPTION 'SESSION_TYPE_MILESTONE_INVALID'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.session_type = 'FINAL' THEN
    IF NEW.unit_no <> v_total_units OR NEW.lesson_no <> 0 THEN
      RAISE EXCEPTION 'SESSION_TYPE_MILESTONE_INVALID'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_session_type_milestone ON sessions;
CREATE TRIGGER trg_enforce_session_type_milestone
BEFORE INSERT OR UPDATE OF unit_no, lesson_no, session_type
ON sessions
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_session_type_milestone();

COMMIT;
