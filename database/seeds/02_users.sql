-- =============================================================================
-- SEED 02: users — mật khẩu tất cả: Eim@2025
-- $2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e
-- =============================================================================

-- Admin
INSERT INTO users (id, user_code, email, password_hash, role_id, full_name, gender, dob, phone, start_date, allowance) VALUES
('10000000-0000-0000-0000-000000000001', 'EIM-ADM-47291', 'director@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000001',
 'Michael Thompson', 'male', '1978-03-20', '0901234567', '2018-01-10', 0);

-- Academic
INSERT INTO users (id, user_code, email, password_hash, role_id, full_name, gender, dob, phone, start_date, allowance) VALUES
('10000000-0000-0000-0000-000000000002', 'EIM-NHV-83014', 'le.bich@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000002',
 'Lê Thị Bích', 'female', '1992-08-22', '0912345678', '2020-03-01', 300000),
('10000000-0000-0000-0000-000000000003', 'EIM-NHV-61205', 'tran.duc@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000002',
 'Trần Minh Đức', 'male', '1990-11-30', '0923456789', '2021-06-15', 300000);

-- Accountant
INSERT INTO users (id, user_code, email, password_hash, role_id, full_name, gender, dob, phone, start_date, allowance) VALUES
('10000000-0000-0000-0000-000000000004', 'EIM-NKT-62740', 'pham.huong@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000003',
 'Phạm Thu Hương', 'female', '1987-05-10', '0934567890', '2019-07-01', 300000);

-- Teachers (English names)
INSERT INTO users (id, user_code, email, password_hash, role_id, full_name, gender, dob, phone, start_date, salary_per_session, allowance) VALUES
('20000000-0000-0000-0000-000000000001', 'EIM-GV-19283', 'jessica.miller@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000004',
 'Jessica Miller', 'female', '1990-06-15', '0945678901', '2019-09-01', 220000, 500000),
('20000000-0000-0000-0000-000000000002', 'EIM-GV-35847', 'david.carter@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000004',
 'David Carter', 'male', '1988-11-22', '0956789012', '2020-03-15', 200000, 500000),
('20000000-0000-0000-0000-000000000003', 'EIM-GV-52196', 'sarah.johnson@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000004',
 'Sarah Johnson', 'female', '1993-02-08', '0967890123', '2021-01-10', 180000, 400000),
('20000000-0000-0000-0000-000000000004', 'EIM-GV-74031', 'james.wilson@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000004',
 'James Wilson', 'male', '1985-09-30', '0978901234', '2020-08-01', 250000, 600000),
('20000000-0000-0000-0000-000000000005', 'EIM-GV-90512', 'emily.brown@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000004',
 'Emily Brown', 'female', '1995-04-18', '0989012345', '2022-02-15', 170000, 350000),
('20000000-0000-0000-0000-000000000006', 'EIM-GV-28374', 'robert.davis@eim.edu.vn',
 '$2b$12$uJq4xPFhZH7Yyjdl8KTjOetNe8YUwGwTZu7onsJquHz7tvy92Th5e',
 '00000000-0000-0000-0000-000000000004',
 'Robert Davis', 'male', '1991-07-25', '0990123456', '2021-06-01', 190000, 450000);

INSERT INTO salary_change_logs (id, user_id, old_salary_per_session, new_salary_per_session, old_allowance, new_allowance, changed_by, reason) VALUES
('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 200000, 220000, 400000, 500000,
 '10000000-0000-0000-0000-000000000001', 'Tăng lương theo kết quả đánh giá Q4 2024'),
('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 220000, 250000, 500000, 600000,
 '10000000-0000-0000-0000-000000000001', 'Tăng lương do thâm niên 4 năm');
