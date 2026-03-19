SET client_encoding = 'UTF8';

-- FIX 6 (Làm rõ semantics class staff vs cover teacher):
-- - class_staff là nhân sự PHỤ TRÁCH lớp: MAIN teacher và TA (trợ giảng)
-- - cover teacher là theo từng session (sessions.cover_teacher_id), không lưu ở class_staff

-- 1) Chuyển dữ liệu cũ: COVER -> TA (nếu trước đây dùng COVER để chỉ trợ giảng)
UPDATE class_staff
SET type = 'TA'
WHERE type = 'COVER';

-- 2) Cập nhật CHECK constraint của class_staff.type
-- Postgres thường đặt tên constraint theo pattern: <table>_<column>_check
ALTER TABLE class_staff
  DROP CONSTRAINT IF EXISTS class_staff_type_check;

ALTER TABLE class_staff
  ADD CONSTRAINT class_staff_type_check CHECK (type IN ('MAIN', 'TA'));

