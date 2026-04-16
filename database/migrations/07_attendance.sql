-- =============================================================================
-- EIM Migration 07: Attendance & Makeup Sessions
-- Depends on: 05_sessions.sql, 06_students.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- attendance — điểm danh từng học viên mỗi buổi học
-- ---------------------------------------------------------------------------
CREATE TABLE attendance (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID        NOT NULL REFERENCES sessions(id),
  student_id    UUID        NOT NULL REFERENCES students(id),
  enrollment_id UUID        NOT NULL REFERENCES enrollments(id),
  status        VARCHAR(30) NOT NULL CHECK (status IN (
    'present',           -- có mặt đúng giờ
    'late',              -- đến trễ (vẫn tính có mặt)
    'absent_excused',    -- vắng có phép
    'absent_unexcused'   -- vắng không phép
  )),
  note          TEXT,
  recorded_by   UUID        NOT NULL REFERENCES users(id),
  recorded_at   TIMESTAMPTZ DEFAULT now(),
  updated_by    UUID        REFERENCES users(id),
  updated_at    TIMESTAMPTZ,

  UNIQUE(session_id, student_id)  -- 1 học viên 1 record mỗi buổi
);

-- ---------------------------------------------------------------------------
-- makeup_sessions — buổi học bù
-- Mỗi lần vắng có phép chỉ được đăng ký tối đa 1 buổi bù (UNIQUE original_attendance_id)
-- Học viên makeup_blocked = true sẽ bị chặn ở use-case layer
-- ---------------------------------------------------------------------------
CREATE TABLE makeup_sessions (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  makeup_code            VARCHAR(20) UNIQUE NOT NULL,  -- EIM-BB-xxxxx
  original_session_id    UUID        NOT NULL REFERENCES sessions(id),
  original_attendance_id UUID        NOT NULL REFERENCES attendance(id),
  student_id             UUID        NOT NULL REFERENCES students(id),
  enrollment_id          UUID        NOT NULL REFERENCES enrollments(id),
  makeup_date            DATE        NOT NULL,
  room_id                UUID        NOT NULL REFERENCES rooms(id),
  teacher_id             UUID        NOT NULL REFERENCES users(id),
  shift                  SMALLINT    NOT NULL CHECK (shift IN (1, 2)),
  status                 VARCHAR(20) DEFAULT 'pending'
                         CHECK (status IN ('pending','completed','cancelled')),
  note                   TEXT,
  created_by             UUID        NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ DEFAULT now(),

  UNIQUE(original_attendance_id)  -- 1 buổi vắng = tối đa 1 buổi bù
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_attendance_session    ON attendance(session_id);
CREATE INDEX idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX idx_attendance_student    ON attendance(student_id);
CREATE INDEX idx_makeup_enrollment     ON makeup_sessions(enrollment_id);
CREATE INDEX idx_makeup_status         ON makeup_sessions(status);
CREATE INDEX idx_makeup_date           ON makeup_sessions(makeup_date);
