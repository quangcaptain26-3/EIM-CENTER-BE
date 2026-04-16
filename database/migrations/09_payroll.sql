-- =============================================================================
-- EIM Migration 09: Payroll
-- Depends on: 05_sessions.sql, 02_auth.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- payroll_records — bảng lương chốt theo tháng cho từng giáo viên
-- Mỗi GV chỉ chốt 1 lần mỗi tháng (UNIQUE teacher + period)
-- ---------------------------------------------------------------------------
CREATE TABLE payroll_records (
  id                           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_code                 VARCHAR(20) UNIQUE NOT NULL,  -- EIM-PL-xxxxx
  teacher_id                   UUID        NOT NULL REFERENCES users(id),
  period_month                 SMALLINT    NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year                  SMALLINT    NOT NULL,
  sessions_count               SMALLINT    NOT NULL DEFAULT 0,
  salary_per_session_snapshot  DECIMAL(12,0) NOT NULL,  -- snapshot tại thời điểm chốt lương
  allowance_snapshot           DECIMAL(12,0) NOT NULL DEFAULT 0,
  total_salary                 DECIMAL(12,0) NOT NULL,
  finalized_by                 UUID        NOT NULL REFERENCES users(id),
  finalized_at                 TIMESTAMPTZ DEFAULT now(),

  UNIQUE(teacher_id, period_month, period_year)  -- không chốt 2 lần cùng kỳ
);

-- ---------------------------------------------------------------------------
-- payroll_session_details — chi tiết từng buổi trong bảng lương
-- Snapshot: class_code, session_date để bảng lương không bị ảnh hưởng
-- nếu class bị đổi/xoá sau đó.
-- ---------------------------------------------------------------------------
CREATE TABLE payroll_session_details (
  id           UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id   UUID     NOT NULL REFERENCES payroll_records(id),
  session_id   UUID     NOT NULL REFERENCES sessions(id),
  session_date DATE     NOT NULL,
  class_code   VARCHAR(20) NOT NULL,  -- snapshot
  was_cover    BOOLEAN  NOT NULL DEFAULT false  -- true nếu GV này đi dạy thay
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_payroll_teacher ON payroll_records(teacher_id);
CREATE INDEX idx_payroll_period  ON payroll_records(period_month, period_year);
CREATE INDEX idx_payroll_details ON payroll_session_details(payroll_id);
