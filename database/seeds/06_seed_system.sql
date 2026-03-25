-- File: 06_seed_system.sql
-- Mục đích: Khởi tạo dữ liệu System (Notifications, Audit Logs)
-- Phụ thuộc: 01_seed_auth.sql

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ
TRUNCATE TABLE system_notifications CASCADE;
TRUNCATE TABLE system_audit_logs CASCADE;

-- 2. Khởi tạo Notifications — Kế toán nhận thông báo công nợ
INSERT INTO system_notifications (id, user_id, title, body, is_read, created_at) VALUES
  ('4045f2cf-65c1-42e5-a67c-5e36a95d63db', 'ec7e7bee-f0c9-4ae5-adb4-611ab24a419f', '2 hóa đơn đã quá hạn', 'Có 2 hóa đơn đã quá hạn cần xử lý.', FALSE, NOW()),
  ('da1d971c-548b-4564-86c0-a4d55e01d6f6', 'ec7e7bee-f0c9-4ae5-adb4-611ab24a419f', 'Thanh toán mới', 'Bạn có 1 thanh toán mới vừa được ghi nhận.', TRUE, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 3. Khởi tạo Audit Logs
-- Actor: academic (80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9)
INSERT INTO system_audit_logs (id, actor_user_id, action, entity, entity_id, meta, created_at) VALUES
  ('b161d78e-0d85-4178-8ce5-a9f09c201a11', '80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9', 'CREATE', 'student', '0fd2c4b1-66b5-4594-bddc-4f8ccdfd7097', '{"name": "Nguyễn Minh Khoa"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'system_notifications' AS tbl, COUNT(*)::int AS rows FROM system_notifications
UNION ALL SELECT 'system_audit_logs', COUNT(*)::int FROM system_audit_logs;
