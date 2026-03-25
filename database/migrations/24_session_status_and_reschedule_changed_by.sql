-- Mô tả: Thêm session_status trên sessions và changed_by trên session_reschedules.

-- Migration: 24 - Session status enum + changed_by cho reschedule
-- 1. Thêm session_status vào sessions (SCHEDULED | CANCELLED | COMPLETED | MAKEUP)
-- 2. Thêm changed_by vào session_reschedules

-- Sessions: thêm cột status
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_status TEXT NOT NULL DEFAULT 'SCHEDULED';

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS chk_session_status;

ALTER TABLE sessions
  ADD CONSTRAINT chk_session_status CHECK (session_status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED', 'MAKEUP'));

CREATE INDEX IF NOT EXISTS idx_sessions_session_status ON sessions(session_status);

-- Session_reschedules: thêm changed_by
ALTER TABLE session_reschedules
  ADD COLUMN IF NOT EXISTS changed_by UUID NULL REFERENCES auth_users(id) ON DELETE SET NULL;
