ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_pending_today
  ON sessions(session_date, status)
  WHERE status = 'pending';
