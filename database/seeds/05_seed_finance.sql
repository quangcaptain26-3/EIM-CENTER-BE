-- File: 05_seed_finance.sql
-- Mục đích: Khởi tạo dữ liệu Finance (Fee Plans, Invoices, Payments)
-- Phụ thuộc: 03_seed_classes_students.sql

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ
-- Không dùng CASCADE để tránh TRUNCATE bị lan ngược làm mất dữ liệu curriculum_programs
-- (do chain FK từ finance -> enrollments -> classes -> curriculum_programs).
-- Lưu ý: finance_payments.invoice_id tham chiếu finance_invoices, nên cần truncate
-- cả 2 bảng trong cùng 1 lệnh để tránh lỗi FK.
-- Đồng thời, finance_fee_plans có thể đang bị curriculum_programs.fee_plan_id tham chiếu,
-- nên cần gỡ tham chiếu trước khi TRUNCATE finance_fee_plans.

-- Với PostgreSQL, `TRUNCATE` thường bị chặn nếu vẫn còn FK trỏ tới dù ta đã set NULL.
-- Dùng `DELETE` để đảm bảo FK xử lý theo `ON DELETE` (SET NULL / CASCADE) một cách ổn định hơn.
UPDATE curriculum_programs
SET fee_plan_id = NULL
WHERE fee_plan_id IS NOT NULL;

DELETE FROM finance_payments;
DELETE FROM finance_invoices;
DELETE FROM finance_fee_plans;

-- 2. Khởi tạo Fee Plans cho các chương trình
-- Dùng program_id theo code thay vì hard-code UUID, để tránh lệch dữ liệu.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM curriculum_programs WHERE code = 'KINDY') THEN
    RAISE EXCEPTION 'SEED_FINANCE_MISSING_PROGRAM: KINDY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM curriculum_programs WHERE code = 'STARTERS') THEN
    RAISE EXCEPTION 'SEED_FINANCE_MISSING_PROGRAM: STARTERS';
  END IF;
END$$;

INSERT INTO finance_fee_plans (id, program_id, name, amount, currency, sessions_per_week)
SELECT
  x.id,
  p.id,
  x.name,
  x.amount,
  x.currency,
  x.sessions_per_week
FROM (VALUES
  ('fce79df7-3702-4bab-a70e-220ac003fbf7'::uuid, 'KINDY',    'KINDY Standard',    3500000::int, 'VND', 2::int),
  ('df599b2f-a8b4-4d92-9aff-2371e91ab9b9'::uuid, 'STARTERS', 'STARTERS Standard', 4000000::int, 'VND', 2::int)
) AS x(id, program_code, name, amount, currency, sessions_per_week)
JOIN curriculum_programs p ON p.code = x.program_code
ON CONFLICT (id) DO NOTHING;

-- 2.1) Gắn lại fee_plan_id cho curriculum_programs để dữ liệu nhất quán
UPDATE curriculum_programs cp
SET fee_plan_id = ffp.id
FROM finance_fee_plans ffp
WHERE cp.id = ffp.program_id
  AND cp.code IN ('KINDY', 'STARTERS');

-- 3. Khởi tạo Invoices — có ít nhất 1 OVERDUE để Kế toán demo danh sách công nợ
INSERT INTO finance_invoices (id, enrollment_id, amount, status, due_date, issued_at) VALUES
  ('0de09142-d792-44fa-b706-744ff6d065b2', '2cef09b6-4baf-45fa-a887-fbe9e94cb81e', 4000000, 'PAID',   '2025-10-01', '2025-09-01'),
  ('9426d546-50db-48fc-bedd-4a821631b73c', 'd88142cb-2fea-47f4-82ac-d19b80783d45', 4000000, 'ISSUED', '2025-11-01', '2025-10-01'),
  -- Invoice OVERDUE — demo danh sách công nợ cho Kế toán
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e', 'b4b9bf0b-537e-4b7c-ad76-c7d5ed9f8312', 4000000, 'OVERDUE', '2025-08-15', '2025-08-01')
ON CONFLICT (id) DO NOTHING;

-- 4. Khởi tạo Payments
INSERT INTO finance_payments (id, invoice_id, amount, method, paid_at) VALUES
  ('f58a011f-688f-49f4-b9a0-7595696d4d87', '0de09142-d792-44fa-b706-744ff6d065b2', 4000000, 'TRANSFER', '2025-09-05')
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'finance_fee_plans' AS tbl, COUNT(*)::int AS rows FROM finance_fee_plans
UNION ALL SELECT 'finance_invoices', COUNT(*)::int FROM finance_invoices
UNION ALL SELECT 'finance_payments', COUNT(*)::int FROM finance_payments;
