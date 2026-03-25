-- Smoke queries kiểm tra nhanh sau khi seed
-- Có thể chạy trong pgAdmin hoặc psql (không dùng meta-command).

SET client_encoding = 'UTF8';

-- =========================
-- 1) Đếm rows từng bảng chính
-- =========================
SELECT 'auth_users' AS table_name, COUNT(*)::int AS row_count FROM auth_users
UNION ALL SELECT 'auth_roles', COUNT(*)::int FROM auth_roles
UNION ALL SELECT 'auth_permissions', COUNT(*)::int FROM auth_permissions
UNION ALL SELECT 'auth_user_roles', COUNT(*)::int FROM auth_user_roles
UNION ALL SELECT 'auth_role_permissions', COUNT(*)::int FROM auth_role_permissions
UNION ALL SELECT 'curriculum_programs', COUNT(*)::int FROM curriculum_programs
UNION ALL SELECT 'curriculum_units', COUNT(*)::int FROM curriculum_units
UNION ALL SELECT 'students', COUNT(*)::int FROM students
UNION ALL SELECT 'classes', COUNT(*)::int FROM classes
UNION ALL SELECT 'class_schedules', COUNT(*)::int FROM class_schedules
UNION ALL SELECT 'class_staff', COUNT(*)::int FROM class_staff
UNION ALL SELECT 'enrollments', COUNT(*)::int FROM enrollments
UNION ALL SELECT 'enrollment_history', COUNT(*)::int FROM enrollment_history
UNION ALL SELECT 'sessions', COUNT(*)::int FROM sessions
UNION ALL SELECT 'session_feedback', COUNT(*)::int FROM session_feedback
UNION ALL SELECT 'session_scores', COUNT(*)::int FROM session_scores
UNION ALL SELECT 'trial_leads', COUNT(*)::int FROM trial_leads
UNION ALL SELECT 'trial_schedules', COUNT(*)::int FROM trial_schedules
UNION ALL SELECT 'trial_conversions', COUNT(*)::int FROM trial_conversions
UNION ALL SELECT 'finance_fee_plans', COUNT(*)::int FROM finance_fee_plans
UNION ALL SELECT 'finance_invoices', COUNT(*)::int FROM finance_invoices
UNION ALL SELECT 'finance_payments', COUNT(*)::int FROM finance_payments
UNION ALL SELECT 'system_notifications', COUNT(*)::int FROM system_notifications
UNION ALL SELECT 'system_audit_logs', COUNT(*)::int FROM system_audit_logs
ORDER BY table_name;

-- =========================
-- 2) Danh sách users + roles
-- =========================
SELECT
  u.email,
  u.full_name,
  COALESCE(string_agg(r.code, ', ' ORDER BY r.code), '') AS roles
FROM auth_users u
LEFT JOIN auth_user_roles ur ON ur.user_id = u.id
LEFT JOIN auth_roles r ON r.id = ur.role_id
GROUP BY u.id
ORDER BY u.email;

-- =========================
-- 3) Sĩ số từng lớp (đếm enrollment ACTIVE)
-- =========================
SELECT
  c.code,
  c.status,
  c.capacity,
  COUNT(e.id)::int AS active_enrollments
FROM classes c
LEFT JOIN enrollments e ON e.class_id = c.id AND e.status = 'ACTIVE'
GROUP BY c.id
ORDER BY c.code;

-- =========================
-- 4) Invoices theo status (OVERDUE nổi bật)
-- =========================
SELECT status, COUNT(*)::int AS invoice_count, SUM(amount)::bigint AS total_amount
FROM finance_invoices
GROUP BY status
ORDER BY
  CASE status
    WHEN 'OVERDUE' THEN 0
    WHEN 'ISSUED' THEN 1
    WHEN 'PAID' THEN 2
    WHEN 'DRAFT' THEN 3
    WHEN 'CANCELED' THEN 4
    ELSE 99
  END,
  status;

SELECT
  i.id,
  i.enrollment_id,
  i.amount,
  i.due_date,
  i.status
FROM finance_invoices i
WHERE i.status = 'OVERDUE'
ORDER BY i.due_date ASC;

-- =========================
-- 5) Notifications chưa đọc theo user
-- =========================
SELECT
  u.email,
  COUNT(n.id)::int AS unread_count
FROM system_notifications n
JOIN auth_users u ON u.id = n.user_id
WHERE n.is_read = FALSE
GROUP BY u.email
ORDER BY unread_count DESC, u.email;

-- =========================
-- 6) 5 audit log gần nhất
-- =========================
SELECT
  l.created_at,
  u.email AS actor_email,
  l.action,
  l.entity,
  l.entity_id,
  l.meta
FROM system_audit_logs l
LEFT JOIN auth_users u ON u.id = l.actor_user_id
ORDER BY l.created_at DESC
LIMIT 5;

-- =============================================
-- SMOKE QUERIES — Chạy sau migrate + seed để xác nhận DB đúng
-- =============================================

-- 7) Kiểm tra đủ 4 chương trình (programs)
-- Kiểm tra: curriculum_programs có đủ KINDY, STARTERS, MOVERS, FLYERS
-- Mong đợi: 4 dòng
SELECT code, name FROM curriculum_programs ORDER BY id;

-- 8) Kiểm tra mỗi program có đủ units
-- Kiểm tra: mỗi chương trình có đúng số unit (Kindy 10, Starters 12, Movers 12, Flyers 12)
-- Mong đợi: Kindy(>=1), Starters(6+), Movers(>=1), Flyers(>=1) — seed hiện có thể ít hơn nhưng phải có
SELECT p.code, COUNT(u.id)::int AS so_units
FROM curriculum_programs p
LEFT JOIN curriculum_units u ON u.program_id = p.id
GROUP BY p.code
ORDER BY p.code;

-- 9) Kiểm tra đủ 6 roles
-- Kiểm tra: auth_roles có đủ ACCOUNTANT, ACADEMIC, DIRECTOR, ROOT, SALES, TEACHER
-- Mong đợi: 6 dòng
SELECT code FROM auth_roles ORDER BY code;

-- 10) Kiểm tra mỗi role có ít nhất 1 user
-- Kiểm tra: không có role nào trống (orphan)
-- Mong đợi: mỗi role >= 1 user
SELECT r.code, COUNT(ur.user_id)::int AS so_user
FROM auth_roles r
LEFT JOIN auth_user_roles ur ON ur.role_id = r.id
GROUP BY r.code
ORDER BY r.code;

-- 11) Kiểm tra sessions của từng lớp có khớp curriculum không
-- Kiểm tra: số session mỗi lớp so với total_units × lessons_per_unit của program
-- Mong đợi: số session hợp lý (≤ total_units × lessons_per_unit)
SELECT
  c.code AS class_code,
  COUNT(s.id)::int AS so_session,
  cp.code AS program,
  (cp.total_units * cp.lessons_per_unit) AS expected_max
FROM classes c
JOIN curriculum_programs cp ON cp.id = c.program_id
LEFT JOIN sessions s ON s.class_id = c.id
GROUP BY c.code, cp.code, cp.total_units, cp.lessons_per_unit
ORDER BY c.code;

-- 12) Kiểm tra session type có đúng rule không
-- Kiểm tra: NORMAL chiếm đa số, TEST/MIDTERM/FINAL ít hơn
-- Mong đợi: NORMAL > các loại khác
SELECT session_type AS type, COUNT(*)::int AS so_luong
FROM sessions
GROUP BY session_type
ORDER BY session_type;

-- 13) Kiểm tra không có enrollment nào có class_id trỏ tới lớp không tồn tại
-- Kiểm tra: referential integrity của enrollments -> classes
-- Mong đợi: 0
SELECT COUNT(*)::int AS loi_fk_class
FROM enrollments e
WHERE e.class_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = e.class_id);

-- 14) Kiểm tra không có invoice nào orphan (enrollment không tồn tại)
-- Kiểm tra: referential integrity của finance_invoices -> enrollments
-- Mong đợi: 0
SELECT COUNT(*)::int AS loi_fk_invoice
FROM finance_invoices i
WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.id = i.enrollment_id);

-- 15) Kiểm tra không có payment nào orphan
-- Kiểm tra: referential integrity của finance_payments -> finance_invoices
-- Mong đợi: 0
SELECT COUNT(*)::int AS loi_fk_payment
FROM finance_payments p
WHERE NOT EXISTS (SELECT 1 FROM finance_invoices i WHERE i.id = p.invoice_id);

-- 16) Kiểm tra invoice status có nhất quán với payments không
-- Kiểm tra: PAID phải có tổng thanh toán >= amount; DRAFT/ISSUED khi đã thanh toán đủ phải là PAID
-- Mong đợi: 0 dòng (không có invoice nào sai status)
SELECT
  i.id,
  i.status,
  i.amount,
  COALESCE(SUM(p.amount), 0)::bigint AS tong_da_tra
FROM finance_invoices i
LEFT JOIN finance_payments p ON p.invoice_id = i.id
GROUP BY i.id, i.status, i.amount
HAVING i.status NOT IN ('OVERDUE', 'CANCELED')
  AND (
    (i.status = 'PAID' AND COALESCE(SUM(p.amount), 0) < i.amount)
    OR (i.status IN ('DRAFT', 'ISSUED') AND COALESCE(SUM(p.amount), 0) >= i.amount)
  );

-- 17) Kiểm tra không có 2 enrollment active cùng lúc cho 1 học sinh 1 lớp
-- Kiểm tra: constraint business — mỗi student + class chỉ có tối đa 1 ACTIVE
-- Mong đợi: 0 dòng
SELECT student_id, class_id, COUNT(*)::int AS so_enrollment_active
FROM enrollments
WHERE status = 'ACTIVE' AND class_id IS NOT NULL
GROUP BY student_id, class_id
HAVING COUNT(*) > 1;

-- 18) Kiểm tra lớp nào đang vượt capacity
-- Kiểm tra: sĩ số ACTIVE không vượt quá capacity của lớp
-- Mong đợi: 0 dòng
SELECT
  c.code AS class_code,
  c.capacity,
  COUNT(e.id)::int AS hien_tai
FROM classes c
JOIN enrollments e ON e.class_id = c.id AND e.status = 'ACTIVE'
GROUP BY c.code, c.capacity
HAVING COUNT(e.id) > c.capacity;

