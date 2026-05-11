-- =============================================================================
-- EIM Migration 06: Students, Enrollments & Related
-- Depends on: 04_programs_classes.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
CREATE TABLE students (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_code  VARCHAR(20) UNIQUE NOT NULL,   -- EIM-HS-xxxxx
  full_name     VARCHAR(200) NOT NULL,
  dob           DATE,
  gender        VARCHAR(10)  CHECK (gender IN ('male','female','other')),
  address       TEXT,
  school_name   VARCHAR(200),

  -- Thông tin phụ huynh
  parent_name   VARCHAR(200),
  parent_phone  VARCHAR(20),
  parent_phone2 VARCHAR(20),
  parent_zalo   VARCHAR(20),

  -- Level hiện tại (auto-update khi complete khóa)
  current_level VARCHAR(20) REFERENCES programs(code),
  test_result   TEXT,
  is_active     BOOLEAN     DEFAULT true,

  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- enrollments — học viên ghi danh vào 1 lớp
-- ---------------------------------------------------------------------------
CREATE TABLE enrollments (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id           UUID        NOT NULL REFERENCES students(id),
  program_id           UUID        NOT NULL REFERENCES programs(id),
  class_id             UUID        NOT NULL REFERENCES classes(id),
  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending','trial','active','paused',
                          'transferred','dropped','completed'
                        )),
  tuition_fee          DECIMAL(12,0) NOT NULL,  -- IMMUTABLE sau khi paid_at != NULL
  sessions_attended    SMALLINT    DEFAULT 0,   -- auto-sync bởi trigger
  sessions_absent      SMALLINT    DEFAULT 0,   -- auto-sync bởi trigger
  class_transfer_count SMALLINT    DEFAULT 0,   -- tối đa 1 lần chuyển lớp
  makeup_blocked       BOOLEAN     DEFAULT false,
  enrolled_at          TIMESTAMPTZ DEFAULT now(),
  paid_at              TIMESTAMPTZ,
  created_by           UUID        REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- enrollment_history — audit trail mọi thay đổi trạng thái enrollment
-- ---------------------------------------------------------------------------
CREATE TABLE enrollment_history (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id      UUID        NOT NULL REFERENCES enrollments(id),
  action             VARCHAR(50) NOT NULL CHECK (action IN (
    'enrolled','trial_started','activated','paused','resumed',
    'class_changed','program_changed','transferred_out','transferred_in',
    'dropped','completed','refunded_full'
  )),
  from_status        VARCHAR(20),
  to_status          VARCHAR(20),
  from_class_id      UUID        REFERENCES classes(id),
  to_class_id        UUID        REFERENCES classes(id),
  from_program_id    UUID        REFERENCES programs(id),
  to_program_id      UUID        REFERENCES programs(id),
  sessions_at_action SMALLINT,
  changed_by         UUID        REFERENCES users(id),
  action_date        TIMESTAMPTZ DEFAULT now(),
  note               TEXT
);

-- ---------------------------------------------------------------------------
-- pause_requests — yêu cầu bảo lưu khóa học
-- ---------------------------------------------------------------------------
CREATE TABLE pause_requests (
  id                           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_code                 VARCHAR(20) UNIQUE NOT NULL,  -- EIM-BL-xxxxx
  enrollment_id                UUID        NOT NULL REFERENCES enrollments(id),
  requested_by                 UUID        NOT NULL REFERENCES users(id),
  reason                       TEXT        NOT NULL,
  sessions_attended_at_request SMALLINT    NOT NULL,
  status                       VARCHAR(20) DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),
  reviewed_by                  UUID        REFERENCES users(id),
  reviewed_at                  TIMESTAMPTZ,
  review_note                  TEXT,
  created_at                   TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- transfer_requests — chuyển nhượng suất học giữa 2 học sinh
-- ---------------------------------------------------------------------------
CREATE TABLE transfer_requests (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_student_id    UUID        NOT NULL REFERENCES students(id),
  to_student_id      UUID        NOT NULL REFERENCES students(id),
  from_enrollment_id UUID        NOT NULL REFERENCES enrollments(id),
  to_enrollment_id   UUID        REFERENCES enrollments(id),   -- set sau khi tạo enrollment mới
  sessions_remaining SMALLINT    NOT NULL,
  amount_transferred DECIMAL(12,0) NOT NULL,
  status             VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','completed','cancelled')),
  debit_receipt_id   UUID,   -- FK → receipts (set sau khi tạo phiếu thu âm)
  credit_receipt_id  UUID,   -- FK → receipts (set sau khi tạo phiếu thu dương)
  processed_by       UUID        REFERENCES users(id),
  processed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_enrollments_student  ON enrollments(student_id);
CREATE INDEX idx_enrollments_class    ON enrollments(class_id);
CREATE INDEX idx_enrollments_status   ON enrollments(status);
CREATE INDEX idx_enrollment_history   ON enrollment_history(enrollment_id);
CREATE INDEX idx_students_phone       ON students(parent_phone);
CREATE INDEX idx_students_is_active   ON students(is_active);
CREATE INDEX idx_pause_requests_enrollment ON pause_requests(enrollment_id);
