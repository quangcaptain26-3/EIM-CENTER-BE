-- File: 02_seed_curriculum.sql
-- Mục đích: Khởi tạo chương trình học (Programs, Units, Lessons)
-- Phụ thuộc: none

SET client_encoding = 'UTF8';

-- 1. Xóa dữ liệu cũ
TRUNCATE TABLE curriculum_unit_lessons CASCADE;
TRUNCATE TABLE curriculum_units CASCADE;
TRUNCATE TABLE curriculum_programs CASCADE;

-- 2. Khởi tạo Programs với UUID cố định
INSERT INTO curriculum_programs (id, code, name, level, sort_order, total_units, lessons_per_unit, sessions_per_week) VALUES
  ('6202f645-b04c-476f-a997-627de8f2b5ae', 'KINDY',    'Kindy English',       'KINDY',    1, 10, 7, 2),
  ('d0af2da6-2e86-41e4-9400-34160e9ac6ae', 'STARTERS', 'Cambridge Starters',  'STARTERS', 2, 12, 7, 2),
  ('53b4eb2f-61b7-45c1-90b1-1a94fcfd5fe9', 'MOVERS',   'Cambridge Movers',    'MOVERS',   3, 12, 7, 2),
  ('f5591e8f-185b-4a73-8e15-4a27c678ff16', 'FLYERS',   'Cambridge Flyers',    'FLYERS',   4, 12, 7, 2)
ON CONFLICT (id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

-- 3. Khởi tạo Units cho STARTERS (Mẫu)
-- Dùng DO block để dễ quản lý UUID units nếu cần, hoặc insert trực tiếp.
-- Ở đây dùng UUID cố định cho 2 units đầu tiên của STARTERS để các file sau có thể dùng nếu cần.
INSERT INTO curriculum_units (id, program_id, unit_no, title, total_lessons) VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 1, 'Unit 1: Hello!', 7),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 2, 'Unit 2: My Family', 7),
  (gen_random_uuid(), 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 3, 'Unit 3: Quiz 1', 7),
  (gen_random_uuid(), 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 4, 'Unit 4: At School', 7),
  (gen_random_uuid(), 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 5, 'Unit 5: My Toys', 7),
  (gen_random_uuid(), 'd0af2da6-2e86-41e4-9400-34160e9ac6ae', 6, 'Unit 6: Mid-term review', 7)
ON CONFLICT (program_id, unit_no) DO NOTHING;

-- 4. Khởi tạo Lessons cho Unit 1 & 2 của STARTERS
-- Unit 1
INSERT INTO curriculum_unit_lessons (unit_id, lesson_no, title, session_pattern) VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 1, 'Lesson 1: Greeting', '1&2'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 2, 'Lesson 2: Alphabet', '1&2'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 3, 'Lesson 3: Numbers', '3'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 4, 'Lesson 4: Colors', '4&5'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 5, 'Lesson 5: Review Colors', '4&5'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 6, 'Lesson 6: Pronunciation', '6&7'),
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 7, 'Lesson 7: Unit Review', '6&7')
ON CONFLICT (unit_id, lesson_no) DO NOTHING;

-- Unit 2
INSERT INTO curriculum_unit_lessons (unit_id, lesson_no, title, session_pattern) VALUES
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 1, 'Lesson 1: Father & Mother', '1&2'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 2, 'Lesson 2: Brother & Sister', '1&2'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 3, 'Lesson 3: Grandparents', '3'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 4, 'Lesson 4: Family Tree', '4&5'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 5, 'Lesson 5: Description', '4&5'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 6, 'Lesson 6: Story time', '6&7'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 7, 'Lesson 7: Unit Test Prep', '6&7')
ON CONFLICT (unit_id, lesson_no) DO NOTHING;

-- Seed thêm units cho Kindy, Movers, Flyers — mỗi program có ít nhất vài units để demo
INSERT INTO curriculum_units (program_id, unit_no, title, total_lessons) VALUES
  ('6202f645-b04c-476f-a997-627de8f2b5ae', 1, 'Unit 1: Colors', 7),
  ('6202f645-b04c-476f-a997-627de8f2b5ae', 2, 'Unit 2: Numbers', 7),
  ('53b4eb2f-61b7-45c1-90b1-1a94fcfd5fe9', 1, 'Unit 1: Welcome', 7),
  ('53b4eb2f-61b7-45c1-90b1-1a94fcfd5fe9', 2, 'Unit 2: My Day', 7),
  ('f5591e8f-185b-4a73-8e15-4a27c678ff16', 1, 'Unit 1: New friends', 7),
  ('f5591e8f-185b-4a73-8e15-4a27c678ff16', 2, 'Unit 2: At home', 7)
ON CONFLICT (program_id, unit_no) DO NOTHING;

-- Verify
SELECT 'curriculum_programs' AS tbl, COUNT(*)::int AS rows FROM curriculum_programs
UNION ALL SELECT 'curriculum_units', COUNT(*)::int FROM curriculum_units
UNION ALL SELECT 'curriculum_unit_lessons', COUNT(*)::int FROM curriculum_unit_lessons;
