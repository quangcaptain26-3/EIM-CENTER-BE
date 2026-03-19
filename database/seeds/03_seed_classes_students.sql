-- File: 03_seed_classes_students.sql
-- Mục đích: Khởi tạo dữ liệu Students, Classes, schedules và Enrollments
-- Phụ thuộc: 00_seed_roles_permissions.sql, 02_seed_curriculum.sql

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ
TRUNCATE TABLE enrollment_history CASCADE;
TRUNCATE TABLE enrollments CASCADE;
TRUNCATE TABLE class_staff CASCADE;
TRUNCATE TABLE class_schedules CASCADE;
TRUNCATE TABLE classes CASCADE;
TRUNCATE TABLE students CASCADE;

-- 2. Khởi tạo Students với UUID cố định
INSERT INTO students (id, full_name, dob, gender, phone, email, guardian_name, guardian_phone, address) VALUES
  ('0fd2c4b1-66b5-4594-bddc-4f8ccdfd7097', 'Nguyễn Minh Khoa',  '2016-04-12', 'MALE',   '0901234501', 'khoa.nguyen.demo1@example.com', 'Nguyễn Văn A', '0901234567', 'Quận 7, TP.HCM'),
  ('24644201-b5a2-435d-ae34-f59b264a83f1', 'Trần Gia Hân',      '2016-09-03', 'FEMALE', '0901234502', 'han.tran.demo1@example.com',    'Trần Thị B',   '0902345678', 'Quận 3, TP.HCM'),
  ('e48c77aa-a747-4e00-8674-f4ff6d34910b', 'Lê Quốc Bảo',       '2017-01-25', 'MALE',   '0901234503', 'bao.le.demo1@example.com',      'Lê Văn C',     '0903456789', 'Thủ Đức, TP.HCM'),
  ('b4a23530-881c-42a9-b224-a4642fb3ce88', 'Phạm Nhật Minh',    '2016-06-18', 'MALE',   '0901234504', 'minh.pham.demo1@example.com',   'Phạm Thị D',   '0904567890', 'Quận 10, TP.HCM'),
  ('0a93b830-e4a7-4dbe-9941-592185b94955', 'Võ Thảo Nguyên',    '2017-03-10', 'FEMALE', '0901234505', 'nguyen.vo.demo1@example.com',   'Võ Văn E',     '0905678901', 'Bình Thạnh, TP.HCM'),

  -- Bổ sung thêm học viên (để có dữ liệu lớp đông hơn)
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c101', 'Đặng Quỳnh Anh',     '2016-02-08', 'FEMALE', '0901234506', 'anh.dang.demo1@example.com',    'Đặng Văn F',   '0906789012', 'Gò Vấp, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c102', 'Nguyễn Hoàng Nam',   '2016-11-21', 'MALE',   '0901234507', 'nam.nguyen.demo1@example.com',  'Nguyễn Thị G', '0907890123', 'Tân Bình, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c103', 'Phan Khánh Linh',    '2017-05-14', 'FEMALE', '0901234508', 'linh.phan.demo1@example.com',   'Phan Văn H',   '0908901234', 'Quận 1, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c104', 'Bùi Gia Bảo',        '2016-08-30', 'MALE',   '0901234509', 'bao.bui.demo1@example.com',     'Bùi Thị I',    '0909012345', 'Quận 5, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c105', 'Lý Thảo My',         '2017-10-02', 'FEMALE', '0901234510', 'my.ly.demo1@example.com',       'Lý Văn K',     '0909123456', 'Quận 8, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c106', 'Huỳnh Đức Tín',      '2016-03-27', 'MALE',   '0901234511', 'tin.huynh.demo1@example.com',   'Huỳnh Thị L',  '0909234567', 'Phú Nhuận, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c107', 'Mai Khả Vy',         '2017-07-19', 'FEMALE', '0901234512', 'vy.mai.demo1@example.com',      'Mai Văn M',    '0909345678', 'Thủ Đức, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c108', 'Trương Nhật Hào',    '2016-12-05', 'MALE',   '0901234513', 'hao.truong.demo1@example.com',  'Trương Thị N', '0909456789', 'Bình Tân, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c109', 'Đỗ Yến Nhi',         '2017-09-11', 'FEMALE', '0901234514', 'nhi.do.demo1@example.com',      'Đỗ Văn P',     '0909567890', 'Quận 11, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c10a', 'Vũ Minh Trí',        '2016-01-16', 'MALE',   '0901234515', 'tri.vu.demo1@example.com',      'Vũ Thị Q',     '0909678901', 'Quận 4, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c10b', 'Ngô Bảo Ngọc',       '2017-04-06', 'FEMALE', '0901234516', 'ngoc.ngo.demo1@example.com',    'Ngô Văn R',    '0909789012', 'Quận 6, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c10c', 'Lâm Hải Đăng',       '2016-05-23', 'MALE',   '0901234517', 'dang.lam.demo1@example.com',    'Lâm Thị S',    '0909890123', 'Quận 12, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c10d', 'Trần Thiên Ý',       '2017-02-28', 'FEMALE', '0901234518', 'y.tran.demo1@example.com',      'Trần Văn T',   '0909901234', 'Quận 2, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c10e', 'Nguyễn Gia Phúc',    '2016-10-09', 'MALE',   '0901234519', 'phuc.nguyen.demo1@example.com', 'Nguyễn Thị U', '0909912345', 'Quận 9, TP.HCM'),
  ('6c7d1b22-0c2b-4d11-9c79-1ef203f3c10f', 'Phạm Bảo Trân',      '2017-06-01', 'FEMALE', '0901234520', 'tran.pham.demo1@example.com',   'Phạm Văn V',   '0909923456', 'Quận 7, TP.HCM')
ON CONFLICT (id) DO NOTHING;

-- 3. Khởi tạo Classes với UUID cố định
-- Programs: STARTERS (d0af2da6-2e86-41e4-9400-34160e9ac6ae), MOVERS (53b4eb2f-61b7-45c1-90b1-1a94fcfd5fe9)
INSERT INTO classes (id, code, name, program_id, room, capacity, start_date, status) VALUES
  ('e8c18712-51c2-47ba-b3d2-be18724f4241', 'EIM1-STARTERS-2025A', 'EIM1 Starters 2025A', 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 'Room S1', 12, '2025-09-01', 'ACTIVE'),
  ('3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'EIM1-MOVERS-2025A',   'EIM1 Movers 2025A',   '53b4eb2f-61b7-45c1-90b1-1a94fcfd5fe9', 'Room M1', 12, '2025-09-03', 'ACTIVE'),
  ('78b1093b-6f85-4a32-956b-8b93c04b950e', 'EIM1-STARTERS-2024B', 'EIM1 Starters 2024B', 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 'Room S2', 12, '2024-09-02', 'CLOSED')
ON CONFLICT (id) DO NOTHING;

-- 4. Khởi tạo Lịch học (Schedules)
INSERT INTO class_schedules (id, class_id, weekday, start_time, end_time) VALUES
  -- EIM1-STARTERS-2025A: Thứ 2 (1) & Thứ 4 (3)
  (gen_random_uuid(), 'e8c18712-51c2-47ba-b3d2-be18724f4241', 1, '18:00:00', '19:30:00'),
  (gen_random_uuid(), 'e8c18712-51c2-47ba-b3d2-be18724f4241', 3, '18:00:00', '19:30:00'),
  -- EIM1-MOVERS-2025A: Thứ 3 (2) & Thứ 5 (4)
  (gen_random_uuid(), '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 2, '18:00:00', '19:30:00'),
  (gen_random_uuid(), '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 4, '18:00:00', '19:30:00')
ON CONFLICT DO NOTHING;

-- 5. Gán Nhân sự cho lớp (Class Staff)
-- Users: teacher (6e374495-8f2c-416f-96e2-b6fd525f408c), academic (80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9)
INSERT INTO class_staff (id, class_id, user_id, type) VALUES
  (gen_random_uuid(), 'e8c18712-51c2-47ba-b3d2-be18724f4241', '6e374495-8f2c-416f-96e2-b6fd525f408c', 'MAIN'),
  (gen_random_uuid(), 'e8c18712-51c2-47ba-b3d2-be18724f4241', '80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9', 'TA'),

  -- Movers 2025A cũng có nhân sự để tiện test
  (gen_random_uuid(), '3a98f331-e7d6-4bda-9d70-ac98edc8f432', '6e374495-8f2c-416f-96e2-b6fd525f408c', 'MAIN'),
  (gen_random_uuid(), '3a98f331-e7d6-4bda-9d70-ac98edc8f432', '80eb7da6-ea5d-4dd3-9da8-2135bcdb1fe9', 'TA')
ON CONFLICT DO NOTHING;

-- 6. Khởi tạo Enrollments với UUID cố định
INSERT INTO enrollments (id, student_id, class_id, status, start_date) VALUES
  ('2cef09b6-4baf-45fa-a887-fbe9e94cb81e', '0fd2c4b1-66b5-4594-bddc-4f8ccdfd7097', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),
  ('d88142cb-2fea-47f4-82ac-d19b80783d45', '24644201-b5a2-435d-ae34-f59b264a83f1', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),
  ('b4b9bf0b-537e-4b7c-ad76-c7d5ed9f8312', 'e48c77aa-a747-4e00-8674-f4ff6d34910b', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),

  -- Starters 2025A (thêm học viên)
  ('b5f27d8a-0e65-4a60-9e3a-5e1b0c1e0101', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c101', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),
  ('b5f27d8a-0e65-4a60-9e3a-5e1b0c1e0102', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c102', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),
  ('b5f27d8a-0e65-4a60-9e3a-5e1b0c1e0103', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c103', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'PAUSED', '2025-09-01'),
  ('b5f27d8a-0e65-4a60-9e3a-5e1b0c1e0104', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c104', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),
  ('b5f27d8a-0e65-4a60-9e3a-5e1b0c1e0105', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c105', 'e8c18712-51c2-47ba-b3d2-be18724f4241', 'ACTIVE', '2025-09-01'),

  -- Movers 2025A (một phần học viên chuyển sang lớp Movers)
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0201', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c106', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'ACTIVE', '2025-09-03'),
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0202', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c107', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'ACTIVE', '2025-09-03'),
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0203', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c108', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'ACTIVE', '2025-09-03'),
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0204', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c109', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'DROPPED', '2025-09-03'),
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0205', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c10a', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'ACTIVE', '2025-09-03'),
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0206', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c10b', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'ACTIVE', '2025-09-03'),
  ('c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0207', '6c7d1b22-0c2b-4d11-9c79-1ef203f3c10c', '3a98f331-e7d6-4bda-9d70-ac98edc8f432', 'ACTIVE', '2025-09-03')
ON CONFLICT (id) DO NOTHING;

-- 7. Lịch sử đăng ký học mẫu (enrollment_history)
INSERT INTO enrollment_history (id, enrollment_id, from_status, to_status, note) VALUES
  (gen_random_uuid(), 'b5f27d8a-0e65-4a60-9e3a-5e1b0c1e0103', 'ACTIVE', 'PAUSED',  'Xin nghỉ tạm 2 tuần'),
  (gen_random_uuid(), 'c6ad92a1-0a0e-4a9b-8e8d-2a2d0c2e0204', 'ACTIVE', 'DROPPED', 'Phụ huynh xin dừng do bận lịch')
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'students' AS tbl, COUNT(*)::int AS rows FROM students
UNION ALL SELECT 'classes', COUNT(*)::int FROM classes
UNION ALL SELECT 'enrollments', COUNT(*)::int FROM enrollments
UNION ALL SELECT 'enrollment_history', COUNT(*)::int FROM enrollment_history;
