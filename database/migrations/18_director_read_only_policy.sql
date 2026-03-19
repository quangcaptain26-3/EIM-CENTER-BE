-- migration: 18_director_read_only_policy.sql
-- Mục tiêu:
--   1) DIRECTOR chỉ read-heavy cho finance/trials (không WRITE)
--   2) DIRECTOR vẫn giữ quyền xem audit log hệ thống

BEGIN;

-- Gỡ các quyền write không còn phù hợp với DIRECTOR
DELETE FROM auth_role_permissions rp
USING auth_roles r, auth_permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'DIRECTOR'
  AND p.code IN ('FINANCE_WRITE', 'TRIALS_WRITE');

-- Đảm bảo DIRECTOR có quyền đọc audit log
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth_roles r
JOIN auth_permissions p ON p.code = 'SYSTEM_AUDIT_READ'
WHERE r.code = 'DIRECTOR'
ON CONFLICT DO NOTHING;

COMMIT;
