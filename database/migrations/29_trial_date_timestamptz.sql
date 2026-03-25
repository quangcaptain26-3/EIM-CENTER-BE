-- Mô tả: trial_date từ DATE → TIMESTAMPTZ để lưu cả giờ học thử
-- Nguyên nhân: Cột DATE chỉ lưu ngày, mất giờ → SALES hiển thị sai giờ

ALTER TABLE trial_schedules
  ALTER COLUMN trial_date TYPE TIMESTAMPTZ
  USING trial_date::date AT TIME ZONE 'UTC';
