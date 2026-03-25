-- Mô tả: Chuyển lớp — lưu unit_no, lesson_no tại thời điểm chuyển để lớp mới biết học sinh học đến đâu.

SET client_encoding = 'UTF8';

-- 1) enrollments: thêm current_unit_no, current_lesson_no (tiến độ học tại thời điểm chuyển vào)
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS current_unit_no INT NULL,
  ADD COLUMN IF NOT EXISTS current_lesson_no INT NULL;

-- 2) enrollment_history: thêm transfer_unit_no, transfer_lesson_no (audit trail khi chuyển lớp)
ALTER TABLE enrollment_history
  ADD COLUMN IF NOT EXISTS transfer_unit_no INT NULL,
  ADD COLUMN IF NOT EXISTS transfer_lesson_no INT NULL;
