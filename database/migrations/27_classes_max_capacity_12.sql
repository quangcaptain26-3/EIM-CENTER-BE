-- =============================================================================
-- EIM Migration 27: Sĩ số lớp tối đa 12 học viên (OVERVIEW / CLASS_RULES)
-- Chuẩn hóa dữ liệu cũ + CHECK để không tăng max_capacity qua SQL tay.
-- =============================================================================

UPDATE classes
SET max_capacity = 12
WHERE max_capacity > 12 OR max_capacity IS NULL;

UPDATE classes
SET min_capacity = LEAST(GREATEST(min_capacity, 1), LEAST(12, max_capacity))
WHERE min_capacity > max_capacity OR min_capacity < 1 OR min_capacity > 12;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_classes_max_capacity_le_12'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT chk_classes_max_capacity_le_12
      CHECK (max_capacity <= 12 AND max_capacity >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_classes_min_le_max'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT chk_classes_min_le_max
      CHECK (min_capacity >= 1 AND min_capacity <= max_capacity);
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_classes_max_capacity_le_12 ON classes IS
  'Mỗi lớp tối đa 12 học viên (trial + active theo trigger capacity).';
