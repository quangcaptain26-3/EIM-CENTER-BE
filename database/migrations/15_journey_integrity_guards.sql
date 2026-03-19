SET client_encoding = 'UTF8';

-- ============================================================
-- PART 9.1: LEAD → TRIAL → STUDENT → ENROLLMENT JOURNEY AUDIT
-- Mục tiêu: siết integrity dữ liệu (không thêm feature mới)
-- - Chống duplicate Student theo phone/email
-- - Ràng buộc FK cho enrollments.class_id (nullable) → classes.id
-- ============================================================

BEGIN;

-- 1) enrollments.class_id FK (nullable) để tránh orphan classId
-- (Blueprint cho phép NULL, nên FK vẫn hợp lệ với NULL)
ALTER TABLE enrollments
  DROP CONSTRAINT IF EXISTS fk_enrollments_class_id;

ALTER TABLE enrollments
  ADD CONSTRAINT fk_enrollments_class_id
  FOREIGN KEY (class_id)
  REFERENCES classes(id)
  ON DELETE SET NULL;

-- 2) Unique student identity guards
-- - Phone: thường là khóa định danh thực tế (nếu đã có).
-- - Email: normalize LOWER(email) để tránh trùng khác hoa/thường.
-- Lưu ý: dùng partial unique để cho phép NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_phone
  ON students (phone)
  WHERE phone IS NOT NULL AND LENGTH(TRIM(phone)) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_email_lower
  ON students (LOWER(email))
  WHERE email IS NOT NULL AND LENGTH(TRIM(email)) > 0;

COMMIT;

