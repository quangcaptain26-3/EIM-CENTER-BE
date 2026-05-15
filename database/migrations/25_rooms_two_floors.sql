-- =============================================================================
-- EIM Migration 25: Phòng học 2 tầng — OVERVIEW v5 §8.1 (floor, loại phòng, tiện ích)
-- Phụ thuộc: 03_facility.sql
-- =============================================================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS floor SMALLINT
    CHECK (floor IS NULL OR floor IN (1, 2));

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (room_type IN ('normal', 'large'));

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN rooms.floor IS 'Tầng 1 hoặc 2 — chỉ mang tính hiển thị / báo cáo; conflict phòng vẫn theo room_id.';
COMMENT ON COLUMN rooms.room_type IS 'normal | large (phòng lớn).';
COMMENT ON COLUMN rooms.amenities IS 'JSONB: projector, ac, whiteboard, speakers, ...';

-- View nhóm phòng theo tầng (OVERVIEW §14.2)
CREATE OR REPLACE VIEW v_rooms_by_floor AS
SELECT
  id,
  room_code,
  floor,
  capacity,
  room_type,
  amenities,
  is_active,
  created_at
FROM rooms
WHERE is_active = true
ORDER BY floor NULLS LAST, room_code;

COMMENT ON VIEW v_rooms_by_floor IS 'Phòng đang hoạt động, sắp xếp theo tầng — dùng FE/API list phòng.';
