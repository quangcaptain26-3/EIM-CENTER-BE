-- Sửa mật khẩu director@eim.edu.vn và sales@eim.edu.vn về Eim@2024
-- Chạy: psql "%DATABASE_URL%" -f database/scripts/fix_director_sales_password.sql
--
-- Nguyên nhân: seed-runtime.ts dùng mật khẩu '123456' và ghi đè sales;
-- hoặc seed auth chưa chạy / DB khác.

\echo 'Đang reset mật khẩu director + sales về Eim@2024...'

UPDATE auth_users
SET password_hash = '$2b$10$YAnFetGk6x4Ex72/OXu4X.Sv3K1gmjc.gIKZ/ycP5sB8T1UMnM8c.'
WHERE email IN ('director@eim.edu.vn', 'sales@eim.edu.vn');

-- Nếu 0 rows: users chưa tồn tại → chạy seed: npm run db:psql:seed
SELECT email, full_name, status
FROM auth_users
WHERE email IN ('director@eim.edu.vn', 'sales@eim.edu.vn');
