-- Cập nhật tên nhân sự NVHC (không cần db:fresh) — khớp seeds/02_users.sql
-- Chạy: psql "$DATABASE_URL" -f database/scripts/update_staff_seed_names.sql

UPDATE users SET full_name = 'Trần Tùng Anh', email = 'tunganhtran@eim.edu.vn'
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE users SET full_name = 'Lê Thị Thế', email = 'lethe@eim.edu.vn'
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE users SET full_name = 'Đặng Thu Minh', email = 'dangthuminh@eim.edu.vn'
WHERE id = '10000000-0000-0000-0000-000000000003';

UPDATE users SET full_name = 'Bùi Khánh Linh', email = 'khanhlinhbui@eim.edu.vn'
WHERE id = '10000000-0000-0000-0000-000000000004';
