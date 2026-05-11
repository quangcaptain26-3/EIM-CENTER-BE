-- =============================================================================
-- EIM Migration 17: HR leave + staff payroll
-- Depends on: 02_auth.sql, 09_payroll.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Đơn nghỉ phép nhân viên (không phải giáo viên dạy theo buổi)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id       UUID NOT NULL REFERENCES users(id),
  leave_date     DATE NOT NULL,
  leave_type     VARCHAR(30) NOT NULL
                CHECK (leave_type IN ('annual_leave', 'sick_leave', 'unpaid_leave')),
  reason         TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by   UUID NOT NULL REFERENCES users(id),
  reviewed_by    UUID REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  review_note    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, leave_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_staff_date
  ON staff_leave_requests(staff_id, leave_date);

-- ---------------------------------------------------------------------------
-- Trigger cập nhật updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_staff_leave_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_leave_updated_at ON staff_leave_requests;
CREATE TRIGGER trg_staff_leave_updated_at
BEFORE UPDATE ON staff_leave_requests
FOR EACH ROW
EXECUTE FUNCTION fn_staff_leave_set_updated_at();

-- ---------------------------------------------------------------------------
-- Double-enforce leave quota:
-- 2 ngày phép/tháng, vượt quota thì auto chuyển unpaid_leave (không block).
-- Nếu muốn đổi quota: sửa monthly_leave_allowance trong system_config + v_leave_balance.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'system_config'
      AND column_name = 'description'
  ) THEN
    INSERT INTO system_config(key, value, description)
    VALUES ('monthly_leave_allowance', '2', 'Số ngày phép hưởng lương mỗi tháng cho nhân viên')
    ON CONFLICT (key) DO NOTHING;
  ELSE
    INSERT INTO system_config(key, value)
    VALUES ('monthly_leave_allowance', '2')
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_staff_leave_adjust_type()
RETURNS TRIGGER AS $$
DECLARE
  monthly_allowance INT;
  used_paid_days INT;
BEGIN
  SELECT COALESCE(value::int, 2)
  INTO monthly_allowance
  FROM system_config
  WHERE key = 'monthly_leave_allowance';

  IF NEW.leave_type = 'unpaid_leave' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::int
  INTO used_paid_days
  FROM staff_leave_requests lr
  WHERE lr.staff_id = NEW.staff_id
    AND lr.status = 'approved'
    AND lr.leave_type IN ('annual_leave', 'sick_leave')
    AND EXTRACT(MONTH FROM lr.leave_date) = EXTRACT(MONTH FROM NEW.leave_date)
    AND EXTRACT(YEAR FROM lr.leave_date) = EXTRACT(YEAR FROM NEW.leave_date)
    AND (TG_OP <> 'UPDATE' OR lr.id <> NEW.id);

  IF used_paid_days >= monthly_allowance THEN
    NEW.leave_type := 'unpaid_leave';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_leave_adjust_type ON staff_leave_requests;
CREATE TRIGGER trg_staff_leave_adjust_type
BEFORE INSERT OR UPDATE OF leave_type, leave_date, staff_id, status
ON staff_leave_requests
FOR EACH ROW
WHEN (NEW.status = 'approved' OR NEW.status = 'pending')
EXECUTE FUNCTION fn_staff_leave_adjust_type();

-- ---------------------------------------------------------------------------
-- View cân đối phép theo tháng (không tích lũy)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_leave_balance AS
WITH cfg AS (
  SELECT COALESCE(value::int, 2) AS monthly_allowance
  FROM system_config
  WHERE key = 'monthly_leave_allowance'
),
months AS (
  SELECT
    EXTRACT(MONTH FROM CURRENT_DATE)::int AS period_month,
    EXTRACT(YEAR FROM CURRENT_DATE)::int AS period_year
)
SELECT
  u.id AS staff_id,
  u.user_code AS staff_code,
  u.full_name AS staff_name,
  m.period_month,
  m.period_year,
  c.monthly_allowance,
  COALESCE(SUM(CASE WHEN lr.status = 'approved' AND lr.leave_type IN ('annual_leave', 'sick_leave') THEN 1 ELSE 0 END), 0)::int AS used_paid_days,
  COALESCE(SUM(CASE WHEN lr.status = 'approved' AND lr.leave_type = 'unpaid_leave' THEN 1 ELSE 0 END), 0)::int AS unpaid_days,
  GREATEST(c.monthly_allowance - COALESCE(SUM(CASE WHEN lr.status = 'approved' AND lr.leave_type IN ('annual_leave', 'sick_leave') THEN 1 ELSE 0 END), 0), 0)::int AS remaining_paid_days
FROM users u
CROSS JOIN months m
CROSS JOIN cfg c
LEFT JOIN staff_leave_requests lr
  ON lr.staff_id = u.id
 AND EXTRACT(MONTH FROM lr.leave_date) = m.period_month
 AND EXTRACT(YEAR FROM lr.leave_date) = m.period_year
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.user_code, u.full_name, m.period_month, m.period_year, c.monthly_allowance;

-- ---------------------------------------------------------------------------
-- Payroll nhân sự hành chính
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_payroll_records (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id                 UUID NOT NULL REFERENCES users(id),
  period_month             SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year              SMALLINT NOT NULL,
  monthly_salary_snapshot  DECIMAL(12,0) NOT NULL,
  unpaid_days              SMALLINT NOT NULL DEFAULT 0,
  deduction_amount         DECIMAL(12,0) NOT NULL DEFAULT 0,
  gross_salary             DECIMAL(12,0) NOT NULL,
  note                     TEXT NOT NULL,
  finalized_by             UUID NOT NULL REFERENCES users(id),
  finalized_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_period
  ON staff_payroll_records(period_year, period_month);

-- Preview function để app và SQL dùng cùng 1 công thức.
CREATE OR REPLACE FUNCTION fn_staff_payroll_preview(
  p_staff_id UUID,
  p_month INT,
  p_year INT
)
RETURNS TABLE (
  staff_id UUID,
  monthly_salary DECIMAL(12,0),
  unpaid_days INT,
  deduction_amount DECIMAL(12,0),
  gross_salary DECIMAL(12,0)
) AS $$
DECLARE
  salary_value DECIMAL(12,0);
  unpaid_count INT;
BEGIN
  SELECT COALESCE(monthly_salary, 0) INTO salary_value
  FROM users
  WHERE id = p_staff_id;

  SELECT COUNT(*)::int INTO unpaid_count
  FROM staff_leave_requests
  WHERE staff_id = p_staff_id
    AND status = 'approved'
    AND leave_type = 'unpaid_leave'
    AND EXTRACT(MONTH FROM leave_date) = p_month
    AND EXTRACT(YEAR FROM leave_date) = p_year;

  RETURN QUERY
  SELECT
    p_staff_id,
    COALESCE(salary_value, 0),
    COALESCE(unpaid_count, 0),
    ROUND((COALESCE(unpaid_count, 0) * COALESCE(salary_value, 0)) / 26.0, 0)::DECIMAL(12,0),
    GREATEST(COALESCE(salary_value, 0) - ROUND((COALESCE(unpaid_count, 0) * COALESCE(salary_value, 0)) / 26.0, 0), 0)::DECIMAL(12,0);
END;
$$ LANGUAGE plpgsql STABLE;
