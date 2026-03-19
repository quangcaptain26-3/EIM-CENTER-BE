-- File: 05_seed_finance.sql
-- Mục đích: Khởi tạo dữ liệu Finance (Fee Plans, Invoices, Payments)
-- Phụ thuộc: 03_seed_classes_students.sql

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ
TRUNCATE TABLE finance_payments CASCADE;
TRUNCATE TABLE finance_invoices CASCADE;
TRUNCATE TABLE finance_fee_plans CASCADE;

-- 2. Khởi tạo Fee Plans cho các chương trình
-- Programs: KINDY (6202f645-b04c-476f-a997-627de8f2b5ae), STARTERS (d0af2da6-2e86-41e4-9400-34160e9ac6ae)
INSERT INTO finance_fee_plans (id, program_id, name, amount, currency, sessions_per_week) VALUES
  ('fce79df7-3702-4bab-a70e-220ac003fbf7', '6202f645-b04c-476f-a997-627de8f2b5ae', 'KINDY Standard',    3500000, 'VND', 2),
  ('df599b2f-a8b4-4d92-9aff-2371e91ab9b9', 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 'STARTERS Standard', 4000000, 'VND', 2)
ON CONFLICT (id) DO NOTHING;

-- 3. Khởi tạo Invoices cho Enrollments
-- Enrollment: 2cef09b6-4baf-45fa-a887-fbe9e94cb81e (HV1)
INSERT INTO finance_invoices (id, enrollment_id, amount, status, due_date, issued_at) VALUES
  ('0de09142-d792-44fa-b706-744ff6d065b2', '2cef09b6-4baf-45fa-a887-fbe9e94cb81e', 4000000, 'PAID',   '2025-10-01', '2025-09-01'),
  ('9426d546-50db-48fc-bedd-4a821631b73c', 'd88142cb-2fea-47f4-82ac-d19b80783d45', 4000000, 'ISSUED', '2025-11-01', '2025-10-01')
ON CONFLICT (id) DO NOTHING;

-- 4. Khởi tạo Payments
INSERT INTO finance_payments (id, invoice_id, amount, method, paid_at) VALUES
  ('f58a011f-688f-49f4-b9a0-7595696d4d87', '0de09142-d792-44fa-b706-744ff6d065b2', 4000000, 'TRANSFER', '2025-09-05')
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'finance_fee_plans' AS tbl, COUNT(*)::int AS rows FROM finance_fee_plans
UNION ALL SELECT 'finance_invoices', COUNT(*)::int FROM finance_invoices
UNION ALL SELECT 'finance_payments', COUNT(*)::int FROM finance_payments;
