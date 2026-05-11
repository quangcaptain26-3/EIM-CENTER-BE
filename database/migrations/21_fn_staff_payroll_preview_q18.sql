-- =============================================================================
-- EIM Migration 21: Q18 — fn_staff_payroll_preview bổ sung chỉ số phép & total_deduction
-- Phụ thuộc: 17_hr_staff_leave_payroll.sql
-- Deduction vẫn chỉ từ unpaid_leave đã duyệt; annual/sick vượt quota đã được trigger
-- chuyển sang unpaid_leave — hàm trả thêm paid_leave_days_used / remaining để minh bạch.
-- =============================================================================

DROP FUNCTION IF EXISTS fn_staff_payroll_preview(uuid, integer, integer);

CREATE OR REPLACE FUNCTION fn_staff_payroll_preview(
  p_staff_id UUID,
  p_month INT,
  p_year INT
)
RETURNS TABLE (
  staff_id UUID,
  monthly_salary DECIMAL(12,0),
  unpaid_days INT,
  paid_leave_days_used INT,
  monthly_paid_allowance INT,
  remaining_paid_days INT,
  deduction_amount DECIMAL(12,0),
  gross_salary DECIMAL(12,0),
  total_deduction DECIMAL(12,0)
) AS $$
DECLARE
  salary_value DECIMAL(12,0);
  unpaid_count INT;
  paid_used INT;
  allowance INT;
  ded DECIMAL(12,0);
  gross DECIMAL(12,0);
BEGIN
  SELECT COALESCE(monthly_salary, 0) INTO salary_value
  FROM users
  WHERE id = p_staff_id;

  SELECT COALESCE(
    (SELECT value::int FROM system_config WHERE key = 'monthly_leave_allowance' LIMIT 1),
    2
  ) INTO allowance;

  SELECT COUNT(*)::int INTO paid_used
  FROM staff_leave_requests
  WHERE staff_id = p_staff_id
    AND status = 'approved'
    AND leave_type IN ('annual_leave', 'sick_leave')
    AND EXTRACT(MONTH FROM leave_date) = p_month
    AND EXTRACT(YEAR FROM leave_date) = p_year;

  SELECT COUNT(*)::int INTO unpaid_count
  FROM staff_leave_requests
  WHERE staff_id = p_staff_id
    AND status = 'approved'
    AND leave_type = 'unpaid_leave'
    AND EXTRACT(MONTH FROM leave_date) = p_month
    AND EXTRACT(YEAR FROM leave_date) = p_year;

  ded := ROUND((COALESCE(unpaid_count, 0) * COALESCE(salary_value, 0)) / 26.0, 0)::DECIMAL(12,0);
  gross := GREATEST(COALESCE(salary_value, 0) - ded, 0)::DECIMAL(12,0);

  RETURN QUERY
  SELECT
    p_staff_id,
    COALESCE(salary_value, 0),
    COALESCE(unpaid_count, 0),
    COALESCE(paid_used, 0),
    COALESCE(allowance, 2),
    GREATEST(COALESCE(allowance, 2) - COALESCE(paid_used, 0), 0)::int,
    ded,
    gross,
    ded;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_staff_payroll_preview(uuid, integer, integer) IS
  'Q18: preview lương NVHC — trừ theo unpaid_leave trong tháng (/26); trigger quota phép → unpaid khi vượt.';
