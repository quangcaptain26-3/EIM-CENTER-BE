-- migration: 21_director_student_read_only_policy.sql
-- Mục tiêu:
--   - DIRECTOR chỉ read-heavy đối với domain học viên/ghi danh (không có quyền write như STUDENT_WRITE),
--     tránh trường hợp DIRECTOR "vô tình write" làm drift roster/payment flow.

BEGIN;

-- Gỡ quyền write không phù hợp với DIRECTOR
DELETE FROM auth_role_permissions rp
USING auth_roles r, auth_permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'DIRECTOR'
  AND p.code IN ('STUDENT_WRITE', 'FEEDBACK_WRITE');

COMMIT;

