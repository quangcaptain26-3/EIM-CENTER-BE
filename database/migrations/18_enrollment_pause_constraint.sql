-- Đảm bảo hard constraint bảo lưu tối đa 1 lần luôn tồn tại ở DB.
-- Muốn tăng lên 2 lần: sửa CHECK (pause_count <= 2) tại đây và đồng bộ MAX_PAUSE_COUNT ở usecase.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'enrollments'
      AND column_name = 'pause_count'
  ) THEN
    RAISE NOTICE 'Skip chk_pause_count: enrollments.pause_count không tồn tại trong schema hiện tại';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_pause_count'
      AND conrelid = 'enrollments'::regclass
  ) THEN
    ALTER TABLE enrollments
      ADD CONSTRAINT chk_pause_count CHECK (pause_count <= 1);
  END IF;
END $$;
