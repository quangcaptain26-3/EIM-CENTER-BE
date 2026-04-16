-- =============================================================================
-- EIM Migration 05: Sessions & Session Covers
-- Depends on: 04_programs_classes.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- sessions — từng buổi học của lớp (24 buổi / khóa)
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id                UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id          UUID      NOT NULL REFERENCES classes(id),
  teacher_id        UUID      NOT NULL REFERENCES users(id),  -- snapshot GV chính khi tạo buổi
  session_no        SMALLINT  NOT NULL CHECK (session_no BETWEEN 1 AND 24),
  session_date      DATE      NOT NULL,
  shift             SMALLINT  NOT NULL CHECK (shift IN (1, 2)),
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','cancelled')),
  session_note      TEXT,
  original_date     DATE,      -- lưu ngày gốc khi reschedule
  reschedule_reason TEXT,
  rescheduled_by    UUID      REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(class_id, session_no)
);

-- ---------------------------------------------------------------------------
-- session_covers — phân công GV dạy thay 1 buổi cụ thể
-- 1 session tối đa 1 cover (PRIMARY KEY = session_id)
-- ---------------------------------------------------------------------------
CREATE TABLE session_covers (
  session_id       UUID        PRIMARY KEY REFERENCES sessions(id),
  cover_teacher_id UUID        NOT NULL REFERENCES users(id),
  assigned_by      UUID        NOT NULL REFERENCES users(id),
  assigned_at      TIMESTAMPTZ DEFAULT now(),
  reason           TEXT,
  status           VARCHAR(20) DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','completed','cancelled')),
  confirmed_at     TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_sessions_class_id   ON sessions(class_id);
CREATE INDEX idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX idx_sessions_date       ON sessions(session_date);
CREATE INDEX idx_sessions_status     ON sessions(status);

-- ---------------------------------------------------------------------------
-- Hàm lấy teacher thực sự dạy 1 session (phụ thuộc sessions + session_covers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION effective_teacher_id(p_session_id UUID)
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT cover_teacher_id FROM session_covers
     WHERE session_id = p_session_id AND status = 'completed'),
    (SELECT teacher_id FROM sessions WHERE id = p_session_id)
  );
$$;
