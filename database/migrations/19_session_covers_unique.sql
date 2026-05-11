-- Chuẩn hóa ràng buộc theo checklist QA:
-- session_covers cần UNIQUE(session_id) dạng contype='u' để query kiểm chứng trả đúng.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'session_covers'::regclass
      AND contype = 'u'
      AND conname = 'uq_session_covers_session_id'
  ) THEN
    ALTER TABLE session_covers
      ADD CONSTRAINT uq_session_covers_session_id UNIQUE (session_id);
  END IF;
END $$;
