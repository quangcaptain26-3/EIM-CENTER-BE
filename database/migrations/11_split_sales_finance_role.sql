-- migration: 11_split_sales_finance_role.sql
-- Tách role SALES_FINANCE thành SALES và ACCOUNTANT
-- Cập nhật dữ liệu hiện có trong auth_roles và auth_role_permissions

BEGIN;

-- 1. Tạo role SALES mới nếu chưa có
INSERT INTO auth_roles (id, code, name)
VALUES (gen_random_uuid(), 'SALES', 'Nhân viên kinh doanh (Sales)')
ON CONFLICT (code) DO NOTHING;

-- 2. Tạo role ACCOUNTANT mới nếu chưa có
INSERT INTO auth_roles (id, code, name)
VALUES (gen_random_uuid(), 'ACCOUNTANT', 'Nhân viên kế toán (Accountant)')
ON CONFLICT (code) DO NOTHING;

-- 3. Cập nhật các user đang có role SALES_FINANCE sang ACCOUNTANT (giả định mặc định là kế toán cho an toàn dữ liệu tài chính)
-- Hoặc có thể update sang cả 2 nếu muốn. Ở đây ta chuyển sang ACCOUNTANT trước.
UPDATE auth_user_roles
SET role_id = (SELECT id FROM auth_roles WHERE code = 'ACCOUNTANT')
WHERE role_id = (SELECT id FROM auth_roles WHERE code = 'SALES_FINANCE');

-- 4. Thêm các permission cho role SALES và ACCOUNTANT từ đầu (tương tự file seed)
DELETE FROM auth_role_permissions WHERE role_id IN (SELECT id FROM auth_roles WHERE code IN ('SALES', 'ACCOUNTANT'));

-- Quyền cho SALES
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT (SELECT id FROM auth_roles WHERE code = 'SALES'), id FROM auth_permissions 
WHERE code IN ('AUTH_ME', 'STUDENT_READ', 'TRIALS_READ', 'TRIALS_WRITE');

-- Quyền cho ACCOUNTANT
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT (SELECT id FROM auth_roles WHERE code = 'ACCOUNTANT'), id FROM auth_permissions 
WHERE code IN ('AUTH_ME', 'STUDENT_READ', 'FINANCE_READ', 'FINANCE_WRITE');

-- 5. Xoá role SALES_FINANCE cũ
DELETE FROM auth_role_permissions WHERE role_id = (SELECT id FROM auth_roles WHERE code = 'SALES_FINANCE');
DELETE FROM auth_roles WHERE code = 'SALES_FINANCE';

COMMIT;
