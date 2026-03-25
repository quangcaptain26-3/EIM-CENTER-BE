-- Mô tả: Unique partial — tối đa một MAIN teacher mỗi lớp.

-- migration: 15_class_staff_main_unique.sql
-- Mục tiêu: mỗi lớp chỉ được có tối đa 1 MAIN teacher.
-- Lý do: hiện tại chỉ UNIQUE(class_id, user_id, type) nên có thể có nhiều MAIN khác nhau.

BEGIN;

-- Unique theo điều kiện: một class chỉ có 1 record type = 'MAIN'
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_staff_one_main_per_class
ON class_staff (class_id)
WHERE type = 'MAIN';

COMMIT;

