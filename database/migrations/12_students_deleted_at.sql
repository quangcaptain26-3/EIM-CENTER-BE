-- =============================================================================
-- Migration 12: students.deleted_at — khớp StudentPgRepo (soft delete)
-- =============================================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
