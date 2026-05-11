-- Smoke queries — chạy sau migrate + seed để xác nhận DB (schema runtime EIM Center)
-- PostgreSQL; không dùng meta-command psql (\...).
-- Cập nhật theo migrations 02–19: users, receipts, payroll_records, programs, ...

SET client_encoding = 'UTF8';

-- =========================
-- 1) Đếm rows từng bảng chính
-- =========================
SELECT 'roles' AS table_name, COUNT(*)::int AS row_count FROM roles
UNION ALL SELECT 'users', COUNT(*)::int FROM users
UNION ALL SELECT 'salary_change_logs', COUNT(*)::int FROM salary_change_logs
UNION ALL SELECT 'user_sessions', COUNT(*)::int FROM user_sessions
UNION ALL SELECT 'rooms', COUNT(*)::int FROM rooms
UNION ALL SELECT 'holidays', COUNT(*)::int FROM holidays
UNION ALL SELECT 'programs', COUNT(*)::int FROM programs
UNION ALL SELECT 'classes', COUNT(*)::int FROM classes
UNION ALL SELECT 'class_staff', COUNT(*)::int FROM class_staff
UNION ALL SELECT 'sessions', COUNT(*)::int FROM sessions
UNION ALL SELECT 'session_covers', COUNT(*)::int FROM session_covers
UNION ALL SELECT 'students', COUNT(*)::int FROM students WHERE deleted_at IS NULL
UNION ALL SELECT 'enrollments', COUNT(*)::int FROM enrollments
UNION ALL SELECT 'enrollment_history', COUNT(*)::int FROM enrollment_history
UNION ALL SELECT 'pause_requests', COUNT(*)::int FROM pause_requests
UNION ALL SELECT 'transfer_requests', COUNT(*)::int FROM transfer_requests
UNION ALL SELECT 'attendance', COUNT(*)::int FROM attendance
UNION ALL SELECT 'makeup_sessions', COUNT(*)::int FROM makeup_sessions
UNION ALL SELECT 'receipts', COUNT(*)::int FROM receipts
UNION ALL SELECT 'refund_requests', COUNT(*)::int FROM refund_requests
UNION ALL SELECT 'payroll_records', COUNT(*)::int FROM payroll_records
UNION ALL SELECT 'payroll_session_details', COUNT(*)::int FROM payroll_session_details
UNION ALL SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
UNION ALL SELECT 'audit_logs_archive', COUNT(*)::int FROM audit_logs_archive
UNION ALL SELECT 'staff_leave_requests', COUNT(*)::int FROM staff_leave_requests
UNION ALL SELECT 'staff_payroll_records', COUNT(*)::int FROM staff_payroll_records
UNION ALL SELECT 'system_config', COUNT(*)::int FROM system_config
ORDER BY table_name;

-- =========================
-- 2) Users + role (JOIN roles)
-- =========================
SELECT
  u.email,
  u.full_name,
  r.code AS role_code
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.deleted_at IS NULL
ORDER BY u.email;

-- =========================
-- 3) Sĩ số từng lớp (enrollment active + trial + pending)
-- =========================
SELECT
  c.class_code,
  c.status,
  c.min_capacity,
  c.max_capacity,
  COUNT(e.id)::int AS roster_enrollments
FROM classes c
LEFT JOIN enrollments e ON e.class_id = c.id AND e.status IN ('pending', 'trial', 'active')
GROUP BY c.id
ORDER BY c.class_code;

-- =========================
-- 4) Công nợ enrollment_debt() — mẫu 10 dòng có học phí
-- =========================
SELECT
  e.id AS enrollment_id,
  enrollment_debt(e.id) AS debt_amount
FROM enrollments e
WHERE e.tuition_fee > 0
ORDER BY debt_amount DESC
LIMIT 10;

-- =========================
-- 5) Phiếu thu theo dấu amount (âm = hoàn / điều chỉnh)
-- =========================
SELECT
  CASE WHEN amount >= 0 THEN 'positive' ELSE 'negative_or_refund' END AS kind,
  COUNT(*)::int AS cnt,
  SUM(amount)::bigint AS sum_amount
FROM receipts
GROUP BY 1
ORDER BY 1;

-- =========================
-- 6) 5 audit log gần nhất
-- =========================
SELECT
  l.event_time,
  l.actor_code,
  l.action,
  l.entity_type,
  l.entity_id,
  l.description
FROM audit_logs l
ORDER BY l.event_time DESC
LIMIT 5;

-- =========================
-- 7) Programs — danh mục
-- =========================
SELECT code, name FROM programs ORDER BY code;

-- =========================
-- 8) Roles — mã vai trò
-- =========================
SELECT code, name FROM roles ORDER BY code;

-- =========================
-- 9) FK: enrollment.class_id hợp lệ
-- Mong đợi: 0
-- =========================
SELECT COUNT(*)::int AS invalid_class_fk
FROM enrollments e
WHERE e.class_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = e.class_id);

-- =========================
-- 10) FK: attendance.session_id → sessions
-- Mong đợi: 0
-- =========================
SELECT COUNT(*)::int AS invalid_attendance_session
FROM attendance a
WHERE NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = a.session_id);

-- =========================
-- 11) FK: receipts.enrollment_id
-- Mong đợi: 0
-- =========================
SELECT COUNT(*)::int AS invalid_receipt_enrollment
FROM receipts r
WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.id = r.enrollment_id);

-- =========================
-- 12) Không có 2 enrollment ACTIVE cùng student + class
-- Mong đợi: 0 dòng
-- =========================
SELECT student_id, class_id, COUNT(*)::int AS active_dup
FROM enrollments
WHERE status = 'active' AND class_id IS NOT NULL
GROUP BY student_id, class_id
HAVING COUNT(*) > 1;

-- =========================
-- 13) Sĩ số ACTIVE không vượt max_capacity
-- Mong đợi: 0 dòng
-- =========================
SELECT
  c.class_code,
  c.max_capacity,
  COUNT(e.id)::int AS active_count
FROM classes c
JOIN enrollments e ON e.class_id = c.id AND e.status = 'active'
GROUP BY c.id, c.class_code, c.max_capacity
HAVING COUNT(e.id) > c.max_capacity;

-- =========================
-- 14) Sessions theo status
-- =========================
SELECT status, COUNT(*)::int AS cnt
FROM sessions
GROUP BY status
ORDER BY status;

-- =========================
-- 15) Payroll theo kỳ (đếm)
-- =========================
SELECT period_year, period_month, COUNT(*)::int AS payroll_rows
FROM payroll_records
GROUP BY period_year, period_month
ORDER BY period_year DESC, period_month DESC;
