-- =============================================================================
-- EIM Migration 14: Classes announced_at
-- =============================================================================

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_classes_announced_at
  ON classes(announced_at);
