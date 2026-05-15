-- =============================================================================
-- EIM Migration 24: Lương cứng NVHC — cột monthly_salary (Q18 OVERVIEW §9.3)
-- fn_staff_payroll_preview / staff payroll routes đọc từ users.monthly_salary.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(12,0);

COMMENT ON COLUMN users.monthly_salary IS
  'Lương tháng NV hành chính (ADMIN/ACADEMIC/ACCOUNTANT). GV dùng salary_per_session.';
