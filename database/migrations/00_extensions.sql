-- =============================================
-- 00_extensions.sql
-- Cài đặt các PostgreSQL extensions cần thiết
-- Chạy file này ĐẦU TIÊN trước tất cả migrations
-- =============================================

-- pgcrypto: cung cấp hàm gen_random_uuid() để tạo UUID tự động
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm: hỗ trợ tìm kiếm full-text và LIKE nhanh hơn (dùng cho search tên học viên)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify cài đặt thành công
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'pg_trgm');