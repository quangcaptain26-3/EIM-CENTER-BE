SET client_encoding = 'UTF8';

-- Bổ sung các cột đã có trong Excel contract nhưng thiếu trong DB:
-- - session_feedback.language_usage
-- - session_scores.note (map từ score_note)

ALTER TABLE session_feedback
  ADD COLUMN IF NOT EXISTS language_usage TEXT NULL;

ALTER TABLE session_scores
  ADD COLUMN IF NOT EXISTS note TEXT NULL;

