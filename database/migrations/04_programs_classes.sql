-- =============================================================================
-- EIM Migration 04: Programs & Classes
-- Depends on: 02_auth.sql, 03_facility.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- programs — KINDY / STARTERS / MOVERS / FLYERS
-- ---------------------------------------------------------------------------
CREATE TABLE programs (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           VARCHAR(20) UNIQUE NOT NULL,  -- KINDY | STARTERS | MOVERS | FLYERS
  name           VARCHAR(100) NOT NULL,
  default_fee    DECIMAL(12,0) NOT NULL,
  total_sessions SMALLINT    DEFAULT 24,
  level_order    SMALLINT    UNIQUE NOT NULL,  -- 1 → 4 (KINDY → FLYERS)
  is_active      BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- classes
-- schedule_days: mảng thứ trong tuần, ví dụ {2,4} = Thứ Hai + Thứ Tư
-- ---------------------------------------------------------------------------
CREATE TABLE classes (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_code    VARCHAR(20) UNIQUE NOT NULL,  -- EIM-LK/LS/LM/LF-xxxxx
  program_id    UUID        NOT NULL REFERENCES programs(id),
  room_id       UUID        NOT NULL REFERENCES rooms(id),
  shift         SMALLINT    NOT NULL CHECK (shift IN (1, 2)),
  schedule_days SMALLINT[]  NOT NULL,         -- {2,4} | {3,5} | ...
  min_capacity  SMALLINT    DEFAULT 5,
  max_capacity  SMALLINT    DEFAULT 12,
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','active','closed')),
  start_date    DATE,
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- class_staff — phân công giáo viên chính cho lớp
-- Mỗi lớp chỉ có 1 GV chính active (effective_to_session IS NULL) tại 1 thời điểm.
-- Khi thay GV: set effective_to_session cho record cũ, insert record mới.
-- ---------------------------------------------------------------------------
CREATE TABLE class_staff (
  id                     UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id               UUID     NOT NULL REFERENCES classes(id),
  teacher_id             UUID     NOT NULL REFERENCES users(id),
  effective_from_session SMALLINT NOT NULL DEFAULT 1,
  effective_to_session   SMALLINT,  -- NULL = còn hiệu lực đến hết khóa
  assigned_by            UUID     NOT NULL REFERENCES users(id),
  assigned_at            TIMESTAMPTZ DEFAULT now(),

  -- Tối đa 1 GV chính active (effective_to_session IS NULL) mỗi lớp
  CONSTRAINT uq_class_staff_active
    UNIQUE (class_id, effective_to_session)
    DEFERRABLE INITIALLY DEFERRED
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_classes_program_id ON classes(program_id);
CREATE INDEX idx_classes_status     ON classes(status);
CREATE INDEX idx_class_staff_class  ON class_staff(class_id);
CREATE INDEX idx_class_staff_teacher ON class_staff(teacher_id);
