SET client_encoding = 'UTF8';

-- Đảm bảo có extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng session_feedback (Đánh giá buổi học)
CREATE TABLE IF NOT EXISTS session_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance TEXT NULL,
    homework TEXT NULL,
    participation TEXT NULL,
    behavior TEXT NULL,
    comment_text TEXT NULL,
    teacher_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- Index cho session_feedback
CREATE INDEX IF NOT EXISTS idx_session_feedback_session_id ON session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_student_id ON session_feedback(student_id);

-- Ghi chú: updated_at của session_feedback sẽ được cập nhật bằng code ở application layer
-- (thay vì dùng trigger để đảm bảo tính nhất quán với logic nghiệp vụ).

-- Tạo bảng session_scores (Điểm số buổi học)
CREATE TABLE IF NOT EXISTS session_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score_type TEXT NOT NULL CHECK (score_type IN ('TEST', 'MIDTERM', 'FINAL')),
    listening INT NULL CHECK (listening IS NULL OR (listening >= 0 AND listening <= 100)),
    reading INT NULL CHECK (reading IS NULL OR (reading >= 0 AND reading <= 100)),
    writing INT NULL CHECK (writing IS NULL OR (writing >= 0 AND writing <= 100)),
    speaking INT NULL CHECK (speaking IS NULL OR (speaking >= 0 AND speaking <= 100)),
    total INT NULL CHECK (total IS NULL OR (total >= 0 AND total <= 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id, score_type)
);

-- Index cho session_scores
CREATE INDEX IF NOT EXISTS idx_session_scores_session_id ON session_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_session_scores_student_id ON session_scores(student_id);

-- Ghi chú: updated_at của session_scores cũng sẽ được cập nhật bằng code ở application layer.
-- Các logic ràng buộc session_type != NORMAL khi có score cũng sẽ được áp dụng trong code.
