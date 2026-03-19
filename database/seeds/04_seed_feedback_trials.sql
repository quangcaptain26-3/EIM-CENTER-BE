-- File: 04_seed_feedback_trials.sql
-- Mục đích: Khởi tạo Sessions, Feedback, Scores và Trial Leads
-- Phụ thuộc: 03_seed_classes_students.sql

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ
TRUNCATE TABLE trial_conversions CASCADE;
TRUNCATE TABLE trial_schedules CASCADE;
TRUNCATE TABLE trial_leads CASCADE;
TRUNCATE TABLE session_scores CASCADE;
TRUNCATE TABLE session_feedback CASCADE;
TRUNCATE TABLE session_reschedules CASCADE;
TRUNCATE TABLE sessions CASCADE;

-- 2. Khởi tạo Sessions mẫu cho lớp STARTERS 2025A
-- Class: e8c18712-51c2-47ba-b3d2-be18724f4241
-- Teacher: 6e374495-8f2c-416f-96e2-b6fd525f408c
INSERT INTO sessions (id, class_id, session_date, unit_no, lesson_no, session_type, main_teacher_id) VALUES
  ('51c1d100-0001-4000-8000-000000000001', 'e8c18712-51c2-47ba-b3d2-be18724f4241', '2025-09-01', 1, 1, 'NORMAL', '6e374495-8f2c-416f-96e2-b6fd525f408c'),
  ('51c1d100-0002-4000-8000-000000000002', 'e8c18712-51c2-47ba-b3d2-be18724f4241', '2025-09-03', 1, 3, 'NORMAL', '6e374495-8f2c-416f-96e2-b6fd525f408c'),
  ('51c1d100-0003-4000-8000-000000000003', 'e8c18712-51c2-47ba-b3d2-be18724f4241', '2025-09-08', 1, 4, 'NORMAL', '6e374495-8f2c-416f-96e2-b6fd525f408c'),
  ('51c1d100-0004-4000-8000-000000000004', 'e8c18712-51c2-47ba-b3d2-be18724f4241', '2025-09-10', 1, 6, 'NORMAL', '6e374495-8f2c-416f-96e2-b6fd525f408c')
ON CONFLICT (id) DO NOTHING;

-- 3. Khởi tạo Session Feedback cho học viên trong lớp
-- Student: 0fd2c4b1-66b5-4594-bddc-4f8ccdfd7097
INSERT INTO session_feedback (id, session_id, student_id, attendance, homework, participation, behavior, comment_text, teacher_id) VALUES
  (gen_random_uuid(), '51c1d100-0001-4000-8000-000000000001', '0fd2c4b1-66b5-4594-bddc-4f8ccdfd7097', 'PRESENT', 'DONE', '5', '5', 'Học viên rất tích cực', '6e374495-8f2c-416f-96e2-b6fd525f408c')
ON CONFLICT DO NOTHING;

-- 4. Khởi tạo Trial Leads
-- Created by: sales (27bd7161-c8c9-4d8e-832a-b9f6c704b4bd)
INSERT INTO trial_leads (id, full_name, phone, email, source, status, note, created_by) VALUES
  ('b2f0a84b-7e84-4c32-8c67-1d1d2026a401', 'Nguyễn Bảo Anh', '0912345678', 'anh.nguyen.trial@example.com', 'facebook', 'NEW', 'Quan tâm lớp Starters', '27bd7161-c8c9-4d8e-832a-b9f6c704b4bd'),
  ('b2f0a84b-7e84-4c32-8c67-1d1d2026a402', 'Trần Gia Huy',   '0923456789', 'huy.tran.trial@example.com',  'referral', 'SCHEDULED', 'Hẹn học thử ngày 15/09', '27bd7161-c8c9-4d8e-832a-b9f6c704b4bd')
ON CONFLICT (id) DO NOTHING;

-- 5. Khởi tạo Trial Schedules
INSERT INTO trial_schedules (id, trial_id, class_id, trial_date) VALUES
  (gen_random_uuid(), 'b2f0a84b-7e84-4c32-8c67-1d1d2026a402', 'e8c18712-51c2-47ba-b3d2-be18724f4241', '2025-09-15')
ON CONFLICT (trial_id) DO NOTHING;

-- Verify
SELECT 'sessions' AS tbl, COUNT(*)::int AS rows FROM sessions
UNION ALL SELECT 'session_feedback', COUNT(*)::int FROM session_feedback
UNION ALL SELECT 'trial_leads', COUNT(*)::int FROM trial_leads;
