-- File: 01_seed_auth.sql
-- Mục đích: Khởi tạo dữ liệu cơ bản cho Auth (Roles, Permissions, Users, User_Roles)
-- Phụ thuộc: none
--
-- DEMO CREDENTIALS (mật khẩu chung: Eim@2024)
-- | Role      | Email               | Mật khẩu  |
-- |-----------|---------------------|-----------|
-- | Root      | root@eim.edu.vn     | Eim@2024  |
-- | Giám đốc  | director@eim.edu.vn | Eim@2024  |
-- | Học vụ    | academic@eim.edu.vn | Eim@2024  |
-- | Sales     | sales@eim.edu.vn    | Eim@2024  |
-- | Kế toán   | accountant@eim.edu.vn | Eim@2024 |
-- | Teacher   | teacher@eim.edu.vn  | Eim@2024  |
-- | Teacher 2 | teacher2@eim.edu.vn | Eim@2024  |

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ để tránh xung đột PK/FK khi chạy lại
TRUNCATE TABLE auth_user_roles CASCADE;
TRUNCATE TABLE auth_role_permissions CASCADE;
TRUNCATE TABLE auth_users CASCADE;
TRUNCATE TABLE auth_roles CASCADE;
TRUNCATE TABLE auth_permissions CASCADE;

-- 2. Khởi tạo Roles với UUID cố định
INSERT INTO auth_roles (id, code, name) VALUES
  ('377f8292-329f-4bf5-acde-54f49375e518', 'ROOT',       'Quản trị viên hệ thống'),
  ('0498f2ee-1ab1-4492-96de-2518b31ae222', 'DIRECTOR',   'Giám đốc trung tâm'),
  ('8c238a3b-467c-47c6-9f7c-0343664fffd8', 'ACADEMIC',   'Nhân viên giáo vụ'),
  ('838dfef6-eebd-4481-9a08-6c272771e237', 'SALES',      'Nhân viên kinh doanh (Sales)'),
  ('e85efefa-0fa6-403f-869a-183e749913a2', 'ACCOUNTANT', 'Nhân viên kế toán (Accountant)'),
  ('1a3caf1d-d46e-446f-9030-310dbfb6b447', 'TEACHER',    'Giáo viên')
ON CONFLICT (id) DO NOTHING;

-- 3. Khởi tạo Permissions với UUID cố định
INSERT INTO auth_permissions (id, code, name) VALUES
  ('d659dbb5-f1d5-435c-a2b1-89d98b603f88', 'AUTH_ME',           'Xem thông tin cá nhân'),
  ('c31b498b-d917-482e-bd25-8bff845e236d', 'STUDENT_READ',      'Xem danh sách học viên'),
  ('ca22c6f5-24dc-4176-9114-f758336a8e5e', 'STUDENT_WRITE',     'Thêm/sửa học viên'),
  ('6f1ec763-b898-4236-b107-e646e37ba2be', 'FEEDBACK_WRITE',    'Thêm feedback học viên'),
  ('13a82cf4-e50a-4535-a055-f2b32fc8debc', 'FINANCE_READ',      'Xem thông tin tài chính'),
  ('96a168fd-645a-4468-8345-4524ff6c794f', 'FINANCE_WRITE',     'Chỉnh sửa tài chính'),
  ('5ea3f3b6-591d-4310-a554-79f8040d4a74', 'TRIALS_READ',       'Xem thông tin tuyển sinh'),
  ('de6a6e21-d2f3-444d-a0c9-8c0af9caa531', 'TRIALS_WRITE',      'Thêm/sửa thông tin tuyển sinh'),
  ('79e362a0-100b-44e9-b84c-4528d2f119a5', 'SYSTEM_AUDIT_READ', 'Xem nhật ký hệ thống')
ON CONFLICT (id) DO NOTHING;

-- 4. Gán Permissions cho Roles
-- ROOT: Full quyền
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth_roles r CROSS JOIN auth_permissions p WHERE r.code = 'ROOT' ON CONFLICT DO NOTHING;

-- DIRECTOR
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth_roles r JOIN auth_permissions p ON p.code IN ('AUTH_ME', 'STUDENT_READ', 'FINANCE_READ', 'TRIALS_READ', 'SYSTEM_AUDIT_READ') WHERE r.code = 'DIRECTOR' ON CONFLICT DO NOTHING;

-- ACADEMIC
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth_roles r JOIN auth_permissions p ON p.code IN ('AUTH_ME', 'STUDENT_READ', 'STUDENT_WRITE', 'TRIALS_READ') WHERE r.code = 'ACADEMIC' ON CONFLICT DO NOTHING;

-- SALES
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth_roles r JOIN auth_permissions p ON p.code IN ('AUTH_ME', 'STUDENT_READ', 'TRIALS_READ', 'TRIALS_WRITE') WHERE r.code = 'SALES' ON CONFLICT DO NOTHING;

-- ACCOUNTANT
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth_roles r JOIN auth_permissions p ON p.code IN ('AUTH_ME', 'STUDENT_READ', 'FINANCE_READ', 'FINANCE_WRITE') WHERE r.code = 'ACCOUNTANT' ON CONFLICT DO NOTHING;

-- TEACHER
INSERT INTO auth_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM auth_roles r JOIN auth_permissions p ON p.code IN ('AUTH_ME', 'STUDENT_READ', 'FEEDBACK_WRITE') WHERE r.code = 'TEACHER' ON CONFLICT DO NOTHING;

-- 5. Tạo Users demo — mỗi role có ít nhất 1 user để demo
-- Email / Mật khẩu: Eim@2024 (dùng chung cho tất cả)
INSERT INTO auth_users (id, email, password_hash, full_name, status) VALUES
  -- root@eim.edu.vn / Eim@2024 — Root (Quản trị viên)
  ('297fab7b-efb2-4324-87ec-a0789d72223c', 'root@eim.edu.vn',       '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Nguyễn Quản Trị (Root)',        'ACTIVE'),
  -- director@eim.edu.vn / Eim@2024 — Giám đốc
  ('a9cf4f09-6d4d-47fd-a332-609cc2079f39', 'director@eim.edu.vn',   '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Trần Giám Đốc (Director)',      'ACTIVE'),
  -- academic@eim.edu.vn / Eim@2024 — Học vụ
  ('80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9', 'academic@eim.edu.vn',   '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Lê Học Vụ (Academic)',          'ACTIVE'),
  -- sales@eim.edu.vn / Eim@2024 — Sales
  ('27bd7161-c8c9-4d8e-832a-b9f6c704b4bd', 'sales@eim.edu.vn',      '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Phạm Sales (Sales)',            'ACTIVE'),
  -- accountant@eim.edu.vn / Eim@2024 — Kế toán
  ('ec7e7bee-f0c9-4ae5-adb4-611ab24a419f', 'accountant@eim.edu.vn', '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Hoàng Kế Toán (Accountant)',    'ACTIVE'),
  -- teacher@eim.edu.vn / Eim@2024 — Teacher (giáo viên chính)
  ('6e374495-8f2c-416f-96e2-b6fd525f408c', 'teacher@eim.edu.vn',    '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Vũ Giáo Viên (Teacher)',        'ACTIVE'),
  -- teacher2@eim.edu.vn / Eim@2024 — Teacher (trợ giảng)
  ('f92d2fb6-dbe6-4ba4-8111-cc847c046ecc', 'teacher2@eim.edu.vn',   '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.', 'Đỗ Thị Lan (Teacher 2)',        'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Gán Role cho Users (1 user 1 role, đủ 6 roles)
INSERT INTO auth_user_roles (user_id, role_id) VALUES
  ('297fab7b-efb2-4324-87ec-a0789d72223c', '377f8292-329f-4bf5-acde-54f49375e518'), -- root
  ('a9cf4f09-6d4d-47fd-a332-609cc2079f39', '0498f2ee-1ab1-4492-96de-2518b31ae222'), -- director
  ('80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9', '8c238a3b-467c-47c6-9f7c-0343664fffd8'), -- academic
  ('27bd7161-c8c9-4d8e-832a-b9f6c704b4bd', '838dfef6-eebd-4481-9a08-6c272771e237'), -- sales
  ('ec7e7bee-f0c9-4ae5-adb4-611ab24a419f', 'e85efefa-0fa6-403f-869a-183e749913a2'), -- accountant
  ('6e374495-8f2c-416f-96e2-b6fd525f408c', '1a3caf1d-d46e-446f-9030-310dbfb6b447'), -- teacher
  ('f92d2fb6-dbe6-4ba4-8111-cc847c046ecc', '1a3caf1d-d46e-446f-9030-310dbfb6b447')  -- teacher2
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify
SELECT 'auth_roles' AS tbl, COUNT(*)::int AS rows FROM auth_roles
UNION ALL SELECT 'auth_permissions', COUNT(*)::int FROM auth_permissions
UNION ALL SELECT 'auth_users', COUNT(*)::int FROM auth_users
UNION ALL SELECT 'auth_user_roles', COUNT(*)::int FROM auth_user_roles;
