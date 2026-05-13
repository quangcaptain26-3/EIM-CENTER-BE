-- =============================================================================
-- EIM Migration: Add attendance tracking columns to sessions
-- Depends on: 05_sessions.sql
-- =============================================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS submitted_by    UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at  TIMESTAMPTZ;

-- submitted_by / submitted_at: GV submit điểm danh lần đầu
-- Sau khi submitted_at IS NOT NULL -> GV không được submit lại
-- last_edited_by / last_edited_at: Học vụ hoặc Admin sửa điểm danh sau đó
-- Muốn thay đổi rule ai được sửa: xem middleware phân quyền trong session.routes.ts

CREATE INDEX IF NOT EXISTS idx_sessions_submitted_at
  ON sessions(submitted_at)
  WHERE submitted_at IS NULL;
