-- Migration: 05_sessions (Sessions & Reschedules)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bảng sessions (Buổi học)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    unit_no INT NOT NULL,
    lesson_no INT NOT NULL,
    session_type TEXT NOT NULL, -- NORMAL, TEST, MIDTERM, FINAL
    main_teacher_id UUID NULL REFERENCES auth_users(id) ON DELETE SET NULL,
    cover_teacher_id UUID NULL REFERENCES auth_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, session_date),
    CONSTRAINT chk_session_type CHECK (session_type IN ('NORMAL', 'TEST', 'MIDTERM', 'FINAL'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date);

-- Bảng session_reschedules (Đổi lịch buổi học)
CREATE TABLE IF NOT EXISTS session_reschedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    note TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_reschedules_session_id ON session_reschedules(session_id);
