-- Mô tả: Cho phép enrollments.class_id NULL và bổ sung trace trên enrollment_history (changed_by, from/to class).

SET client_encoding = 'UTF8';

-- FIX 3 (Blueprint tối thiểu):
-- - Cho phép enrollment tồn tại khi chưa xếp lớp: enrollments.class_id được phép NULL
-- - Lưu metadata tối thiểu để giải thích thay đổi trạng thái/lớp: enrollment_history.changed_by + from_class_id/to_class_id

-- 1) enrollments.class_id -> nullable
ALTER TABLE enrollments
  ALTER COLUMN class_id DROP NOT NULL;

-- 2) enrollment_history: thêm các cột trace tối thiểu
ALTER TABLE enrollment_history
  ADD COLUMN IF NOT EXISTS changed_by UUID NULL,
  ADD COLUMN IF NOT EXISTS from_class_id UUID NULL,
  ADD COLUMN IF NOT EXISTS to_class_id UUID NULL;

-- Ghi chú:
-- - changed_by: userId người thao tác (từ req.user.userId). Có thể NULL cho các job/hành động hệ thống.
-- - from_class_id/to_class_id: chỉ set khi có thay đổi lớp, hoặc khi “gán lớp” từ NULL -> class.

