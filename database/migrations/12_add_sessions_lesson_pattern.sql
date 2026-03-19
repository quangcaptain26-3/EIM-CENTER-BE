-- migration: 12_add_sessions_lesson_pattern.sql
-- Mục tiêu: lưu được pattern gộp bài (vd: "1&2") vào bảng sessions.
-- Lý do: lesson_no chỉ lưu "bài đầu tiên trong cụm" nên mất thông tin gộp bài.

BEGIN;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS lesson_pattern TEXT NULL;

COMMIT;

