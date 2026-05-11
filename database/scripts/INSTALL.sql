-- =============================================================================
-- INSTALL.sql — cài đặt DB từ đầu (một lệnh)
--
-- Gồm: DROP schema public → migrations → seeds → smoke test.
-- MV đã được REFRESH trong database/seeds/09_finance.sql (không lặp ở đây).
-- Seed dữ liệu nghiệp vụ (lớp / buổi học / lương mẫu) bám **tháng 4/2026** để khớp demo FE (Lịch dạy, bộ lọc tháng).
--
-- Chạy từ thư mục gốc eim-center-backend (để đường dẫn database/... đúng):
--   npm run db:fresh
--   hoặc: psql "$DATABASE_URL" -f database/scripts/INSTALL.sql
--
-- Chỉ migrate / chỉ seed (DB đã có, không xóa schema):
--   npm run db:migrate
--   npm run db:seed
--
-- Windows: nếu lỗi encoding tiếng Việt, set PGCLIENTENCODING=UTF8 trước khi psql.
-- =============================================================================

SET client_encoding TO 'UTF8';

\i 'database/scripts/00_full_reset.sql'
\i 'database/scripts/01_run_migrations.sql'
\i 'database/scripts/02_run_seeds.sql'
\i 'database/scripts/03_smoke_test.sql'
