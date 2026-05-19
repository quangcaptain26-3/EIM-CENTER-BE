-- Reset mật khẩu tunganhtran@eim.edu.vn (Giám đốc) và sales@eim.edu.vn về Eim@2025 (bcrypt cost 12, khớp PasswordHasher).
-- Chạy: psql "$DATABASE_URL" -f database/scripts/fix_director_sales_password.sql
--
-- Dùng khi DB đã seed với hash cũ sai hoặc cần đồng bộ mật khẩu seed.

\echo 'Đang reset mật khẩu director + sales về Eim@2025...'

UPDATE users
SET password_hash = '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e'
WHERE email IN ('tunganhtran@eim.edu.vn', 'director@eim.edu.vn', 'sales@eim.edu.vn');

-- Nếu 0 rows: user chưa tồn tại → chạy seed (database/scripts/02_run_seeds.sql)
SELECT email, full_name, is_active
FROM users
WHERE email IN ('tunganhtran@eim.edu.vn', 'director@eim.edu.vn', 'sales@eim.edu.vn');
