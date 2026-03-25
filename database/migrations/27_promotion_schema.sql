-- Mô tả: Hỗ trợ promotion — sort_order chương trình, PENDING enrollment, source_enrollment_id trace.

SET client_encoding = 'UTF8';

-- 1) curriculum_programs: thêm sort_order để xác định thứ tự lên lớp (Kindy→Starters→Movers→Flyers)
ALTER TABLE curriculum_programs
  ADD COLUMN IF NOT EXISTS sort_order INT NULL;

-- Backfill sort_order từ level hiện có (tránh hardcode trong code)
UPDATE curriculum_programs SET sort_order = 1 WHERE level = 'KINDY';
UPDATE curriculum_programs SET sort_order = 2 WHERE level = 'STARTERS';
UPDATE curriculum_programs SET sort_order = 3 WHERE level = 'MOVERS';
UPDATE curriculum_programs SET sort_order = 4 WHERE level = 'FLYERS';
UPDATE curriculum_programs SET sort_order = 99 WHERE sort_order IS NULL;

ALTER TABLE curriculum_programs
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN sort_order SET DEFAULT 99;

-- 2) enrollments: thêm PENDING (chờ xếp lớp) và source_enrollment_id (trace lịch sử promotion)
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS source_enrollment_id UUID NULL REFERENCES enrollments(id) ON DELETE SET NULL;

-- Mở rộng status check để cho phép PENDING
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments
  ADD CONSTRAINT enrollments_status_check CHECK (status IN ('ACTIVE', 'PAUSED', 'PENDING', 'DROPPED', 'TRANSFERRED', 'GRADUATED'));

-- 3) enrollment_history: mở rộng from_status/to_status cho PENDING
ALTER TABLE enrollment_history DROP CONSTRAINT IF EXISTS enrollment_history_from_status_check;
ALTER TABLE enrollment_history DROP CONSTRAINT IF EXISTS enrollment_history_to_status_check;
ALTER TABLE enrollment_history
  ADD CONSTRAINT enrollment_history_from_status_check CHECK (from_status IN ('ACTIVE', 'PAUSED', 'PENDING', 'DROPPED', 'TRANSFERRED', 'GRADUATED'));
ALTER TABLE enrollment_history
  ADD CONSTRAINT enrollment_history_to_status_check CHECK (to_status IN ('ACTIVE', 'PAUSED', 'PENDING', 'DROPPED', 'TRANSFERRED', 'GRADUATED'));

-- 4) uq_enrollments_one_active_per_student: thêm PENDING (1 học sinh chỉ 1 ACTIVE/PAUSED/PENDING)
DROP INDEX IF EXISTS uq_enrollments_one_active_per_student;
CREATE UNIQUE INDEX uq_enrollments_one_active_per_student
  ON enrollments (student_id)
  WHERE status IN ('ACTIVE', 'PAUSED', 'PENDING');
