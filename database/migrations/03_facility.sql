-- =============================================================================
-- EIM Migration 03: Facility — rooms, holidays
-- Depends on: 01_extensions.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------
CREATE TABLE rooms (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(20) UNIQUE NOT NULL,  -- P.101, P.102 ...
  capacity  SMALLINT    DEFAULT 15,
  is_active BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- holidays — ngày lễ / nghỉ
-- Kiểu DATE bắt buộc có năm; seed chuẩn dùng năm mẫu 2000, chỉ ý nghĩa tháng+ngày.
-- is_recurring = true  → so khớp mỗi năm theo THÁNG + NGÀY (bỏ qua năm trong holiday_date)
-- is_recurring = false → so khớp đủ năm-tháng-ngày (ít dùng; VD lễ một lần)
-- ---------------------------------------------------------------------------
CREATE TABLE holidays (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  holiday_date DATE  NOT NULL,
  name         VARCHAR(200) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(holiday_date)
);
