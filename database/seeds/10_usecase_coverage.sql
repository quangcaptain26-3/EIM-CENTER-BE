-- =============================================================================
-- SEED 10: Bổ sung dữ liệu demo đối chiếu use case (QA / EXTENDED V2 / OVERVIEW v5)
-- Chạy sau 09_finance. Tháng “hiện tại” demo: 5/2026 (leave balance view dùng CURRENT_DATE).
-- =============================================================================

-- ── Lương NVHC (Q18) ───────────────────────────────────────────────────────
UPDATE users SET monthly_salary = 18000000
WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE users SET monthly_salary = 12000000
WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE users SET monthly_salary = 11500000
WHERE id = '10000000-0000-0000-0000-000000000003';
UPDATE users SET monthly_salary = 13000000
WHERE id = '10000000-0000-0000-0000-000000000004';

-- ── Bảo lưu: đồng bộ pause_count (Q6/Q34) ───────────────────────────────────
UPDATE enrollments
SET pause_count = 1
WHERE id = '70000000-0000-0000-0000-000000000007';

-- ── Đơn nghỉ phép NVHC — ≥5 bản ghi (Q18, EXTENDED V2) ─────────────────────
-- Tháng 5/2026 (khớp v_leave_balance khi chạy seed vào 5/2026)
INSERT INTO staff_leave_requests (
  id, staff_id, leave_date, leave_type, reason, status,
  requested_by, reviewed_by, reviewed_at, review_note, created_at
) VALUES
('c1000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002', '2026-05-05', 'annual_leave',
 'Nghỉ phép năm cá nhân', 'approved',
 '10000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000001', '2026-05-04 09:00:00+07', 'Duyệt',
 '2026-05-03 10:00:00+07'),
('c1000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000002', '2026-05-12', 'sick_leave',
 'Khám định kỳ', 'pending',
 '10000000-0000-0000-0000-000000000002',
 NULL, NULL, NULL,
 '2026-05-10 08:00:00+07'),
('c1000000-0000-0000-0000-000000000003',
 '10000000-0000-0000-0000-000000000003', '2026-05-06', 'sick_leave',
 'Ốm cảm cúm', 'approved',
 '10000000-0000-0000-0000-000000000003',
 '10000000-0000-0000-0000-000000000001', '2026-05-05 11:00:00+07', 'OK',
 '2026-05-05 09:00:00+07'),
('c1000000-0000-0000-0000-000000000004',
 '10000000-0000-0000-0000-000000000004', '2026-05-08', 'unpaid_leave',
 'Nghỉ không lương có xin trước', 'approved',
 '10000000-0000-0000-0000-000000000004',
 '10000000-0000-0000-0000-000000000001', '2026-05-07 16:00:00+07', 'Ghi nhận trừ lương',
 '2026-05-07 14:00:00+07'),
('c1000000-0000-0000-0000-000000000005',
 '10000000-0000-0000-0000-000000000003', '2026-05-15', 'annual_leave',
 'Việc riêng', 'rejected',
 '10000000-0000-0000-0000-000000000003',
 '10000000-0000-0000-0000-000000000001', '2026-05-14 10:00:00+07', 'Trùng lịch khai giảng, từ chối',
 '2026-05-13 09:00:00+07');

-- Tháng 4/2026 — nghỉ không lương cho preview/chốt lương NV tháng 4
INSERT INTO staff_leave_requests (
  id, staff_id, leave_date, leave_type, reason, status,
  requested_by, reviewed_by, reviewed_at, review_note, created_at
) VALUES
('c1000000-0000-0000-0000-000000000006',
 '10000000-0000-0000-0000-000000000004', '2026-04-11', 'unpaid_leave',
 'Vắng không phép (demo trừ lương /26)', 'approved',
 '10000000-0000-0000-0000-000000000004',
 '10000000-0000-0000-0000-000000000001', '2026-04-11 17:00:00+07', 'Đã ghi nhận',
 '2026-04-10 15:00:00+07');

-- Chốt lương NVHC tháng 4/2026 — Bùi Khánh Linh (Q18/Q29)
INSERT INTO staff_payroll_records (
  id, staff_id, period_month, period_year,
  monthly_salary_snapshot, unpaid_days, deduction_amount, gross_salary,
  note, finalized_by, finalized_at, notes
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004',
  4, 2026,
  13000000,
  1,
  ROUND(13000000 / 26.0, 0)::DECIMAL(12,0),
  GREATEST(13000000 - ROUND(13000000 / 26.0, 0), 0)::DECIMAL(12,0),
  'Lương gross tháng 4/2026 sau trừ 1 ngày unpaid_leave — Thuế & BHXH ngoài hệ thống',
  '10000000-0000-0000-0000-000000000001',
  '2026-05-02 09:00:00+07',
  'Q29: Demo ghi chú sau chốt — kiểm tra lại nếu cần điều chỉnh ngoài bảng'
);

-- ── Lớp sắp khai giảng: công bố (Q12 / §10 OVERVIEW) ───────────────────────
UPDATE classes
SET announced_at = '2026-04-15 08:00:00+07'
WHERE id = '50000000-0000-0000-0000-000000000006';

-- ── Học viên + giữ chỗ reserved (Q32, §5.6) — ≥5 bộ ─────────────────────────
INSERT INTO students (id, student_code, full_name, dob, gender, address, school_name, parent_name, parent_phone, parent_phone2, parent_zalo, test_result, current_level, created_by) VALUES
('60000000-0000-0000-0000-000000000031', 'EIM-HS-10031', 'Nguyễn Gia Hân', '2019-02-10', 'female', '1 Seed Street', 'Mầm non Demo', 'Nguyễn Văn Giữ', '0902222001', NULL, '0902222001', 'Kindy placement', 'KINDY', '10000000-0000-0000-0000-000000000002'),
('60000000-0000-0000-0000-000000000032', 'EIM-HS-10032', 'Trần An Nhiên', '2019-06-20', 'male', '2 Seed Street', 'Mầm non Demo', 'Trần Thị Giữ', '0902222002', NULL, '0902222002', 'Kindy placement', 'KINDY', '10000000-0000-0000-0000-000000000002'),
('60000000-0000-0000-0000-000000000033', 'EIM-HS-10033', 'Lê Bảo Ngọc', '2018-12-01', 'female', '3 Seed Street', 'Mầm non Demo', 'Lê Văn Giữ', '0902222003', NULL, '0902222003', 'Kindy placement', 'KINDY', '10000000-0000-0000-0000-000000000002'),
('60000000-0000-0000-0000-000000000034', 'EIM-HS-10034', 'Phạm Tuệ Lâm', '2019-08-15', 'male', '4 Seed Street', 'Mầm non Demo', 'Phạm Thị Giữ', '0902222004', NULL, '0902222004', 'Kindy placement', 'KINDY', '10000000-0000-0000-0000-000000000002'),
('60000000-0000-0000-0000-000000000035', 'EIM-HS-10035', 'Hoàng Ánh Dương', '2019-03-22', 'female', '5 Seed Street', 'Mầm non Demo', 'Hoàng Văn Giữ', '0902222005', NULL, '0902222005', 'Kindy placement', 'KINDY', '10000000-0000-0000-0000-000000000002');

INSERT INTO enrollments (
  id, student_id, program_id, class_id, status, tuition_fee, reservation_fee,
  enrolled_at, paid_at, created_by
) VALUES
('70000000-0000-0000-0000-000000000031', '60000000-0000-0000-0000-000000000031', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'reserved', 2500000, 500000,
 '2026-04-20 09:00:00+07', NULL, '10000000-0000-0000-0000-000000000002'),
('70000000-0000-0000-0000-000000000032', '60000000-0000-0000-0000-000000000032', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'reserved', 2500000, 500000,
 '2026-04-21 09:00:00+07', NULL, '10000000-0000-0000-0000-000000000002'),
('70000000-0000-0000-0000-000000000033', '60000000-0000-0000-0000-000000000033', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'reserved', 2500000, 500000,
 '2026-04-22 09:00:00+07', NULL, '10000000-0000-0000-0000-000000000002'),
('70000000-0000-0000-0000-000000000034', '60000000-0000-0000-0000-000000000034', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'reserved', 2500000, 500000,
 '2026-04-23 09:00:00+07', NULL, '10000000-0000-0000-0000-000000000002'),
('70000000-0000-0000-0000-000000000035', '60000000-0000-0000-0000-000000000035', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', 'reserved', 2500000, 500000,
 '2026-04-24 09:00:00+07', NULL, '10000000-0000-0000-0000-000000000002');

INSERT INTO receipts (id, receipt_code, payer_name, payer_address, student_id, enrollment_id, reason, amount, amount_in_words, payment_method, payment_date, created_by, payer_signature_name) VALUES
('b1000000-0000-0000-0000-000000000031', 'EIM-PT-10029', 'Nguyễn Văn Giữ', '1 Seed Street', '60000000-0000-0000-0000-000000000031', '70000000-0000-0000-0000-000000000031', 'Phí giữ chỗ Kindy EIM-LK-02', 500000, 'Năm trăm nghìn đồng chẵn', 'cash', '2026-04-20', '10000000-0000-0000-0000-000000000004', 'Nguyễn Văn Giữ'),
('b1000000-0000-0000-0000-000000000032', 'EIM-PT-10030', 'Trần Thị Giữ', '2 Seed Street', '60000000-0000-0000-0000-000000000032', '70000000-0000-0000-0000-000000000032', 'Phí giữ chỗ Kindy EIM-LK-02', 500000, 'Năm trăm nghìn đồng chẵn', 'transfer', '2026-04-21', '10000000-0000-0000-0000-000000000004', 'Trần Thị Giữ'),
('b1000000-0000-0000-0000-000000000033', 'EIM-PT-10031', 'Lê Văn Giữ', '3 Seed Street', '60000000-0000-0000-0000-000000000033', '70000000-0000-0000-0000-000000000033', 'Phí giữ chỗ Kindy EIM-LK-02', 500000, 'Năm trăm nghìn đồng chẵn', 'cash', '2026-04-22', '10000000-0000-0000-0000-000000000004', 'Lê Văn Giữ'),
('b1000000-0000-0000-0000-000000000034', 'EIM-PT-10032', 'Phạm Thị Giữ', '4 Seed Street', '60000000-0000-0000-0000-000000000034', '70000000-0000-0000-0000-000000000034', 'Phí giữ chỗ Kindy EIM-LK-02', 500000, 'Năm trăm nghìn đồng chẵn', 'transfer', '2026-04-23', '10000000-0000-0000-0000-000000000004', 'Phạm Thị Giữ'),
('b1000000-0000-0000-0000-000000000035', 'EIM-PT-10033', 'Hoàng Văn Giữ', '5 Seed Street', '60000000-0000-0000-0000-000000000035', '70000000-0000-0000-0000-000000000035', 'Phí giữ chỗ Kindy EIM-LK-02', 500000, 'Năm trăm nghìn đồng chẵn', 'cash', '2026-04-24', '10000000-0000-0000-0000-000000000004', 'Hoàng Văn Giữ');

-- ── Yêu cầu hoàn phí — thêm ≥5 loại tình huống (Q13/Q19) ───────────────────
INSERT INTO refund_requests (request_code, enrollment_id, reason_type, reason_detail, refund_amount, status, requested_by, reviewed_by, reviewed_at, review_note, created_at) VALUES
('EIM-HP-64002', '70000000-0000-0000-0000-000000000025', 'subjective_financial',
 'Khó khăn tài chính sau khi đã học gần hết khóa.', 0, 'pending',
 '10000000-0000-0000-0000-000000000002', NULL, NULL, NULL, now() - INTERVAL '5 days'),
('EIM-HP-64003', '70000000-0000-0000-0000-000000000024', 'center_unable_within_60days',
 'Lớp pending quá lây, phụ huynh yêu cầu hoàn theo chính sách trung tâm.', 3200000, 'pending',
 '10000000-0000-0000-0000-000000000002', NULL, NULL, NULL, now() - INTERVAL '4 days'),
('EIM-HP-64004', '70000000-0000-0000-0000-000000000023', 'subjective_other',
 'Lý do cá nhân khác — không đủ điều kiện hoàn.', 0, 'approved',
 '10000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000001', now() - INTERVAL '2 days', 'Không hoàn tiền, đã giải thích',
 now() - INTERVAL '6 days'),
('EIM-HP-64005', '70000000-0000-0000-0000-000000000022', 'special_case',
 'Hoàn một phần theo quyết định đặc biệt của giám đốc.', 500000, 'completed',
 '10000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000001', now() - INTERVAL '20 days', 'Đã chuyển khoản hoàn 500.000đ',
 now() - INTERVAL '25 days'),
('EIM-HP-64006', '70000000-0000-0000-0000-000000000021', 'subjective_schedule_conflict',
 'Không thể sắp xếp lịch học bù phù hợp — xin thôi học.', 0, 'rejected',
 '10000000-0000-0000-0000-000000000002',
 '10000000-0000-0000-0000-000000000001', now() - INTERVAL '1 day', 'Không thuộc diện hoàn — đã học >12 buổi',
 now() - INTERVAL '3 days');

-- ── Yêu cầu bảo lưu bổ sung (Q6) ────────────────────────────────────────────
INSERT INTO pause_requests (request_code, enrollment_id, requested_by, reason, sessions_attended_at_request, status, created_at) VALUES
('EIM-BL-29003', '70000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002',
 'Con nhập viện ngắn ngày', 5, 'pending', now() - INTERVAL '1 day');

INSERT INTO pause_requests (request_code, enrollment_id, requested_by, reason, sessions_attended_at_request, status, reviewed_by, reviewed_at, review_note) VALUES
('EIM-BL-29004', '70000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002',
 'Xin nghỉ dài ngày không có chứng từ đầy đủ', 4, 'rejected',
 '10000000-0000-0000-0000-000000000001', now() - INTERVAL '8 days', 'Thiếu minh chứng bệnh viện');

INSERT INTO pause_requests (request_code, enrollment_id, requested_by, reason, sessions_attended_at_request, status, created_at) VALUES
('EIM-BL-29005', '70000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002',
 'Gia đình đi công tác nước ngoài 2 tháng — chờ Admin duyệt', 10, 'pending', now() - INTERVAL '12 days');

-- ── Cover thêm — ≥5 buổi cover trong DB (Q8) ───────────────────────────────
INSERT INTO session_covers (session_id, cover_teacher_id, assigned_by, reason, status, confirmed_at)
SELECT s.id, '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
 'David Carter vắng — Sarah Johnson cover', 'completed', now() - INTERVAL '20 days'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000002' AND s.session_no = 5;

INSERT INTO session_covers (session_id, cover_teacher_id, assigned_by, reason, status, confirmed_at)
SELECT s.id, '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002',
 'James Wilson bận — Emily Brown cover', 'completed', now() - INTERVAL '18 days'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000003' AND s.session_no = 4;

INSERT INTO session_covers (session_id, cover_teacher_id, assigned_by, reason, status, confirmed_at)
SELECT s.id, '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
 'Robert Davis cover buổi Flyers', 'completed', now() - INTERVAL '16 days'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000004' AND s.session_no = 6;

INSERT INTO session_covers (session_id, cover_teacher_id, assigned_by, reason, status, confirmed_at)
SELECT s.id, '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
 'Sarah Johnson cover Kindy', 'completed', now() - INTERVAL '14 days'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000005' AND s.session_no = 3;

-- ── Học bù thêm — ≥5 makeup (Q15) ──────────────────────────────────────────
UPDATE attendance a
SET status = 'absent_excused', note = 'Demo học bù — vắng có phép'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000016'
  AND a.session_id = s.id AND s.class_id = '50000000-0000-0000-0000-000000000003' AND s.session_no = 2;

UPDATE attendance a
SET status = 'absent_excused', note = 'Demo học bù — vắng có phép'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000017'
  AND a.session_id = s.id AND s.class_id = '50000000-0000-0000-0000-000000000003' AND s.session_no = 3;

UPDATE attendance a
SET status = 'absent_excused', note = 'Demo học bù — vắng có phép'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000018'
  AND a.session_id = s.id AND s.class_id = '50000000-0000-0000-0000-000000000003' AND s.session_no = 4;

UPDATE attendance a
SET status = 'absent_excused', note = 'Demo học bù — vắng có phép'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000019'
  AND a.session_id = s.id AND s.class_id = '50000000-0000-0000-0000-000000000003' AND s.session_no = 5;

INSERT INTO makeup_sessions (makeup_code, original_session_id, original_attendance_id, student_id, enrollment_id, makeup_date, room_id, teacher_id, shift, status, note, created_by)
SELECT 'EIM-BB-11002', s.id, a.id, a.student_id, a.enrollment_id, '2026-05-08'::date,
  '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 1, 'pending', 'Bù Movers buổi 2', '10000000-0000-0000-0000-000000000002'
FROM attendance a JOIN sessions s ON s.id = a.session_id
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000016' AND s.session_no = 2 AND s.class_id = '50000000-0000-0000-0000-000000000003'
LIMIT 1;

INSERT INTO makeup_sessions (makeup_code, original_session_id, original_attendance_id, student_id, enrollment_id, makeup_date, room_id, teacher_id, shift, status, note, created_by)
SELECT 'EIM-BB-11003', s.id, a.id, a.student_id, a.enrollment_id, '2026-05-09'::date,
  '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 1, 'pending', 'Bù Movers buổi 3', '10000000-0000-0000-0000-000000000002'
FROM attendance a JOIN sessions s ON s.id = a.session_id
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000017' AND s.session_no = 3 AND s.class_id = '50000000-0000-0000-0000-000000000003'
LIMIT 1;

INSERT INTO makeup_sessions (makeup_code, original_session_id, original_attendance_id, student_id, enrollment_id, makeup_date, room_id, teacher_id, shift, status, note, created_by)
SELECT 'EIM-BB-11004', s.id, a.id, a.student_id, a.enrollment_id, '2026-05-10'::date,
  '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 1, 'completed', 'Đã học bù Movers buổi 4', '10000000-0000-0000-0000-000000000002'
FROM attendance a JOIN sessions s ON s.id = a.session_id
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000018' AND s.session_no = 4 AND s.class_id = '50000000-0000-0000-0000-000000000003'
LIMIT 1;

INSERT INTO makeup_sessions (makeup_code, original_session_id, original_attendance_id, student_id, enrollment_id, makeup_date, room_id, teacher_id, shift, status, note, created_by)
SELECT 'EIM-BB-11005', s.id, a.id, a.student_id, a.enrollment_id, '2026-05-11'::date,
  '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 1, 'cancelled', 'Hủy bù — phụ huynh đổi lịch', '10000000-0000-0000-0000-000000000002'
FROM attendance a JOIN sessions s ON s.id = a.session_id
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000019' AND s.session_no = 5 AND s.class_id = '50000000-0000-0000-0000-000000000003'
LIMIT 1;

-- ── Chuyển nhượng — 1 yêu cầu pending (Q20, thao tác tiếp qua API/UI) ───────
INSERT INTO transfer_requests (
  id, from_student_id, to_student_id, from_enrollment_id, to_enrollment_id,
  sessions_remaining, amount_transferred, status, created_at
) VALUES (
  'e1000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000001',
  NULL,
  14,
  1633333,
  'pending',
  now() - INTERVAL '1 day'
);

-- ── Phiếu thu âm bù trừ (Q24) — không đổi tổng đã thu hợp lệ ─────────────────
INSERT INTO receipts (id, receipt_code, payer_name, payer_address, student_id, enrollment_id, reason, amount, amount_in_words, payment_method, payment_date, created_by, payer_signature_name) VALUES
('b1000000-0000-0000-0000-000000000041', 'EIM-PT-10041', 'Nguyễn Văn Bình', '12 Lê Lợi, Q.1', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
 'Thu nhầm — điều chỉnh', 50000, 'Năm mươi nghìn đồng chẵn', 'cash', '2026-04-25', '10000000-0000-0000-0000-000000000004', 'Nguyễn Văn Bình');

INSERT INTO receipts (id, receipt_code, payer_name, payer_address, student_id, enrollment_id, reason, amount, amount_in_words, payment_method, payment_date, created_by, payer_signature_name, voided_by_receipt_id) VALUES
('b1000000-0000-0000-0000-000000000042', 'EIM-PT-10042', 'Nguyễn Văn Bình', '12 Lê Lợi, Q.1', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001',
 'Bù trừ phiếu thu nhầm EIM-PT-10041', -50000, 'Âm năm mươi nghìn đồng', 'cash', '2026-04-25', '10000000-0000-0000-0000-000000000004', 'Nguyễn Văn Bình',
 'b1000000-0000-0000-0000-000000000041');

-- ── Lịch sử ghi danh bổ sung (≥5 dòng) ─────────────────────────────────────
INSERT INTO enrollment_history (enrollment_id, action, from_status, to_status, sessions_at_action, changed_by, note) VALUES
('70000000-0000-0000-0000-000000000031', 'enrolled', NULL, 'reserved', 0, '10000000-0000-0000-0000-000000000002', 'Đặt giữ chỗ lớp EIM-LK-02'),
('70000000-0000-0000-0000-000000000032', 'enrolled', NULL, 'reserved', 0, '10000000-0000-0000-0000-000000000002', 'Đặt giữ chỗ lớp EIM-LK-02'),
('70000000-0000-0000-0000-000000000008', 'activated', 'pending', 'active', 0, '10000000-0000-0000-0000-000000000002', 'Kích hoạt học chính thức — đã thu cọc, còn nợ học phí'),
('70000000-0000-0000-0000-000000000014', 'trial_started', 'pending', 'trial', 0, '10000000-0000-0000-0000-000000000002', 'Bắt đầu học thử EIM-LS-02'),
('70000000-0000-0000-0000-000000000016', 'activated', 'pending', 'active', 0, '10000000-0000-0000-0000-000000000002', 'Kích hoạt Movers sau đóng phí');

-- ── Audit bổ sung (≥5) ─────────────────────────────────────────────────────
INSERT INTO audit_logs (actor_id, actor_code, actor_role, actor_ip, action, entity_type, entity_id, entity_code, description, event_time) VALUES
('10000000-0000-0000-0000-000000000001', 'EIM-ADM-47291', 'ADMIN', '127.0.0.1', 'STAFF:leave_approved', 'staff_leave_requests', 'c1000000-0000-0000-0000-000000000001', NULL, 'Duyệt phép năm cho Lê Thị Thế 05/05/2026', now() - INTERVAL '11 days'),
('10000000-0000-0000-0000-000000000004', 'EIM-NKT-62740', 'ACCOUNTANT', '127.0.0.1', 'FINANCE:receipt_created', 'receipt', 'b1000000-0000-0000-0000-000000000031', 'EIM-PT-10029', 'Thu phí giữ chỗ Kindy', now() - INTERVAL '18 days'),
('10000000-0000-0000-0000-000000000002', 'EIM-NHV-83014', 'ACADEMIC', '127.0.0.1', 'CLASS:cover_assigned', 'session', NULL, NULL, 'Gán cover bổ sung lớp Starters / Movers / Flyers / Kindy (seed 10)', now() - INTERVAL '17 days'),
('10000000-0000-0000-0000-000000000002', 'EIM-NHV-83014', 'ACADEMIC', '127.0.0.1', 'MAKEUP:created', 'makeup_session', NULL, 'EIM-BB-11002', 'Tạo lịch học bù Movers (mẫu)', now() - INTERVAL '9 days'),
('10000000-0000-0000-0000-000000000001', 'EIM-ADM-47291', 'ADMIN', '127.0.0.1', 'REFUND:reviewed', 'refund_request', NULL, 'EIM-HP-64004', 'Duyệt/từ chối yêu cầu hoàn phí (demo)', now() - INTERVAL '2 days');

-- ── Lương GV cover tháng 4/2026 — Emily Brown (Q8/Q10) ───────────────────────
INSERT INTO payroll_records (id, payroll_code, teacher_id, period_month, period_year, sessions_count, salary_per_session_snapshot, allowance_snapshot, total_salary, finalized_by, finalized_at)
SELECT
  '80000000-0000-0000-0000-000000000002',
  'EIM-PL-74002',
  '20000000-0000-0000-0000-000000000005',
  4,
  2026,
  (SELECT COUNT(*)::smallint
   FROM session_covers sc
   JOIN sessions s ON s.id = sc.session_id
   WHERE sc.cover_teacher_id = '20000000-0000-0000-0000-000000000005'
     AND sc.status = 'completed'
     AND s.status = 'completed'
     AND EXTRACT(MONTH FROM s.session_date) = 4
     AND EXTRACT(YEAR FROM s.session_date) = 2026),
  170000,
  350000,
  (SELECT COUNT(*) FROM session_covers sc
   JOIN sessions s ON s.id = sc.session_id
   WHERE sc.cover_teacher_id = '20000000-0000-0000-0000-000000000005'
     AND sc.status = 'completed'
     AND s.status = 'completed'
     AND EXTRACT(MONTH FROM s.session_date) = 4
     AND EXTRACT(YEAR FROM s.session_date) = 2026) * 170000 + 350000,
  '10000000-0000-0000-0000-000000000004',
  '2026-05-01 10:30:00+07';

INSERT INTO payroll_session_details (payroll_id, session_id, session_date, class_code, was_cover)
SELECT
  '80000000-0000-0000-0000-000000000002',
  s.id,
  s.session_date,
  c.class_code,
  true
FROM session_covers sc
JOIN sessions s ON s.id = sc.session_id
JOIN classes c ON c.id = s.class_id
WHERE sc.cover_teacher_id = '20000000-0000-0000-0000-000000000005'
  AND sc.status = 'completed'
  AND s.status = 'completed'
  AND EXTRACT(MONTH FROM s.session_date) = 4
  AND EXTRACT(YEAR FROM s.session_date) = 2026;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_students;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_users;

DO $$
BEGIN
  RAISE NOTICE '── Seed 10 usecase coverage applied ──';
END $$;
