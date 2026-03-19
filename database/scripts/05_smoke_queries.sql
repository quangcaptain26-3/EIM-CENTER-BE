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

