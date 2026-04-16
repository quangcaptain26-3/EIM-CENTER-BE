-- =============================================================================
-- SEED 09: thu chi, hoàn phí, payroll, audit, refresh search MV
-- =============================================================================

-- Phiếu thu — đủ khóa học + đặt cọc nợ (700…008)
INSERT INTO receipts (receipt_code, payer_name, payer_address, student_id, enrollment_id, reason, amount, amount_in_words, payment_method, payment_date, created_by, payer_signature_name) VALUES
('EIM-PT-10001', 'Nguyễn Văn Bình', '12 Lê Lợi, Q.1, TP.HCM', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'cash', '2026-04-07', '10000000-0000-0000-0000-000000000004', 'Nguyễn Văn Bình'),
('EIM-PT-10002', 'Trần Thị Lan', '45 Trần Hưng Đạo, Q.5', '60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'transfer', '2026-04-07', '10000000-0000-0000-0000-000000000004', 'Trần Thị Lan'),
('EIM-PT-10003', 'Lê Hữu Nam', '78 Nguyễn Trãi, Q.1', '60000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'cash', '2026-04-07', '10000000-0000-0000-0000-000000000004', 'Lê Hữu Nam'),
('EIM-PT-10004', 'Phạm Thị Ngọc', '23 Phạm Ngũ Lão, Q.1', '60000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'transfer', '2026-04-08', '10000000-0000-0000-0000-000000000004', 'Phạm Thị Ngọc'),
('EIM-PT-10005', 'Võ Thanh Hùng', '156 Cách Mạng Tháng 8, Q.3', '60000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000005', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'cash', '2026-04-08', '10000000-0000-0000-0000-000000000004', 'Võ Thanh Hùng'),
('EIM-PT-10006', 'Hoàng Thị Mai', '89 Lý Thường Kiệt, Q.10', '60000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000006', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'transfer', '2026-04-09', '10000000-0000-0000-0000-000000000004', 'Hoàng Thị Mai'),
('EIM-PT-10007', 'Đinh Văn Khánh', '34 Trương Định, Q.3', '60000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000007', 'Học phí khóa Starters - Lớp EIM-LS-01', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'cash', '2026-04-09', '10000000-0000-0000-0000-000000000004', 'Đinh Văn Khánh'),
('EIM-PT-10008', 'Bùi Thị Thu', '67 Hùng Vương, Q.5', '60000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000008', 'Đặt cọc học phí khóa Starters - Lớp EIM-LS-01', 1000000, 'Một triệu đồng chẵn', 'cash', '2026-04-10', '10000000-0000-0000-0000-000000000004', 'Bùi Thị Thu'),
('EIM-PT-10009', 'Nguyễn Thị Hoa', '12 Ngô Đức Kế, Q.1', '60000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000009', 'Học phí khóa Starters - Lớp EIM-LS-02', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'transfer', '2026-04-08', '10000000-0000-0000-0000-000000000004', 'Nguyễn Thị Hoa'),
('EIM-PT-10010', 'Trần Văn Dũng', '23 Đinh Tiên Hoàng, Q.Bình Thạnh', '60000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000010', 'Học phí khóa Starters - Lớp EIM-LS-02', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'cash', '2026-04-08', '10000000-0000-0000-0000-000000000004', 'Trần Văn Dũng'),
('EIM-PT-10011', 'Lý Thị Thanh', '45 Lê Văn Sỹ, Q.3', '60000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000011', 'Học phí khóa Starters - Lớp EIM-LS-02', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'transfer', '2026-04-09', '10000000-0000-0000-0000-000000000004', 'Lý Thị Thanh'),
('EIM-PT-10012', 'Phan Văn Minh', '78 Hai Bà Trưng, Q.1', '60000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000012', 'Học phí khóa Starters - Lớp EIM-LS-02', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'cash', '2026-04-09', '10000000-0000-0000-0000-000000000004', 'Phan Văn Minh'),
('EIM-PT-10013', 'Đặng Thị Hương', '89 Cộng Hòa, Q.Tân Bình', '60000000-0000-0000-0000-000000000015', '70000000-0000-0000-0000-000000000015', 'Học phí khóa Starters - Lớp EIM-LS-02', 2800000, 'Hai triệu tám trăm nghìn đồng chẵn', 'transfer', '2026-04-10', '10000000-0000-0000-0000-000000000004', 'Đặng Thị Hương'),
('EIM-PT-10014', 'Nguyễn Văn Tâm', '23 Nguyễn Đình Chiểu, Q.3', '60000000-0000-0000-0000-000000000016', '70000000-0000-0000-0000-000000000016', 'Học phí khóa Movers - Lớp EIM-LM-01', 3000000, 'Ba triệu đồng chẵn', 'transfer', '2026-03-30', '10000000-0000-0000-0000-000000000004', 'Nguyễn Văn Tâm'),
('EIM-PT-10015', 'Trần Thị Phương', '45 Bà Huyện Thanh Quan, Q.3', '60000000-0000-0000-0000-000000000017', '70000000-0000-0000-0000-000000000017', 'Học phí khóa Movers - Lớp EIM-LM-01', 3000000, 'Ba triệu đồng chẵn', 'cash', '2026-03-30', '10000000-0000-0000-0000-000000000004', 'Trần Thị Phương'),
('EIM-PT-10016', 'Lê Hữu Phước', '12 Tú Xương, Q.3', '60000000-0000-0000-0000-000000000018', '70000000-0000-0000-0000-000000000018', 'Học phí khóa Movers - Lớp EIM-LM-01', 3000000, 'Ba triệu đồng chẵn', 'transfer', '2026-03-31', '10000000-0000-0000-0000-000000000004', 'Lê Hữu Phước'),
('EIM-PT-10017', 'Phạm Thị Bình', '67 Kỳ Đồng, Q.3', '60000000-0000-0000-0000-000000000019', '70000000-0000-0000-0000-000000000019', 'Học phí khóa Movers - Lớp EIM-LM-01', 3000000, 'Ba triệu đồng chẵn', 'cash', '2026-03-31', '10000000-0000-0000-0000-000000000004', 'Phạm Thị Bình'),
('EIM-PT-10018', 'Võ Văn Long', '34 Nam Kỳ Khởi Nghĩa, Q.3', '60000000-0000-0000-0000-000000000020', '70000000-0000-0000-0000-000000000020', 'Học phí khóa Movers - Lớp EIM-LM-01', 3000000, 'Ba triệu đồng chẵn', 'transfer', '2026-04-01', '10000000-0000-0000-0000-000000000004', 'Võ Văn Long'),
('EIM-PT-10019', 'Hoàng Thị Xuân', '78 Lê Thánh Tôn, Q.1', '60000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000021', 'Học phí khóa Movers - Lớp EIM-LM-01', 3000000, 'Ba triệu đồng chẵn', 'cash', '2026-04-01', '10000000-0000-0000-0000-000000000004', 'Hoàng Thị Xuân'),
('EIM-PT-10020', 'Nguyễn Thị Nga', '89 Nguyễn Huệ, Q.1', '60000000-0000-0000-0000-000000000022', '70000000-0000-0000-0000-000000000022', 'Học phí khóa Flyers - Lớp EIM-LF-01', 3200000, 'Ba triệu hai trăm nghìn đồng chẵn', 'transfer', '2026-03-29', '10000000-0000-0000-0000-000000000004', 'Nguyễn Thị Nga'),
('EIM-PT-10021', 'Trần Văn Hải', '23 Đồng Khởi, Q.1', '60000000-0000-0000-0000-000000000023', '70000000-0000-0000-0000-000000000023', 'Học phí khóa Flyers - Lớp EIM-LF-01', 3200000, 'Ba triệu hai trăm nghìn đồng chẵn', 'cash', '2026-03-29', '10000000-0000-0000-0000-000000000004', 'Trần Văn Hải'),
('EIM-PT-10022', 'Lê Thị Hạnh', '45 Pasteur, Q.3', '60000000-0000-0000-0000-000000000024', '70000000-0000-0000-0000-000000000024', 'Học phí khóa Flyers - Lớp EIM-LF-01', 3200000, 'Ba triệu hai trăm nghìn đồng chẵn', 'transfer', '2026-03-30', '10000000-0000-0000-0000-000000000004', 'Lê Thị Hạnh'),
('EIM-PT-10023', 'Phạm Văn Cường', '12 Lê Duẩn, Q.1', '60000000-0000-0000-0000-000000000025', '70000000-0000-0000-0000-000000000025', 'Học phí khóa Flyers - Lớp EIM-LF-01', 3200000, 'Ba triệu hai trăm nghìn đồng chẵn', 'cash', '2026-03-30', '10000000-0000-0000-0000-000000000004', 'Phạm Văn Cường'),
('EIM-PT-10024', 'Võ Thị Thủy', '67 Võ Văn Tần, Q.3', '60000000-0000-0000-0000-000000000026', '70000000-0000-0000-0000-000000000026', 'Học phí khóa Flyers - Lớp EIM-LF-01', 3200000, 'Ba triệu hai trăm nghìn đồng chẵn', 'transfer', '2026-03-31', '10000000-0000-0000-0000-000000000004', 'Võ Thị Thủy'),
('EIM-PT-10025', 'Nguyễn Văn Quang', '34 Đinh Tiên Hoàng, Q.1', '60000000-0000-0000-0000-000000000027', '70000000-0000-0000-0000-000000000027', 'Học phí khóa Kindy - Lớp EIM-LK-01', 2500000, 'Hai triệu năm trăm nghìn đồng chẵn', 'cash', '2026-04-08', '10000000-0000-0000-0000-000000000004', 'Nguyễn Văn Quang'),
('EIM-PT-10026', 'Trần Thị Kim', '56 Hai Bà Trưng, Q.1', '60000000-0000-0000-0000-000000000028', '70000000-0000-0000-0000-000000000028', 'Học phí khóa Kindy - Lớp EIM-LK-01', 2500000, 'Hai triệu năm trăm nghìn đồng chẵn', 'transfer', '2026-04-08', '10000000-0000-0000-0000-000000000004', 'Trần Thị Kim'),
('EIM-PT-10027', 'Lê Hữu Đức', '78 Lê Lai, Q.1', '60000000-0000-0000-0000-000000000029', '70000000-0000-0000-0000-000000000029', 'Học phí khóa Kindy - Lớp EIM-LK-01', 2500000, 'Hai triệu năm trăm nghìn đồng chẵn', 'cash', '2026-04-09', '10000000-0000-0000-0000-000000000004', 'Lê Hữu Đức'),
('EIM-PT-10028', 'Phạm Thị Lan', '12 Calmette, Q.1', '60000000-0000-0000-0000-000000000030', '70000000-0000-0000-0000-000000000030', 'Học phí khóa Kindy - Lớp EIM-LK-01', 2500000, 'Hai triệu năm trăm nghìn đồng chẵn', 'transfer', '2026-04-09', '10000000-0000-0000-0000-000000000004', 'Phạm Thị Lan');

INSERT INTO refund_requests (request_code, enrollment_id, reason_type, reason_detail, refund_amount, status, requested_by, created_at) VALUES
('EIM-HP-64001', '70000000-0000-0000-0000-000000000026', 'subjective_relocation',
 'Gia đình chuyển ra Hà Nội công tác, không thể tiếp tục học. Đã học phần lớn khóa.', 0, 'pending',
 '10000000-0000-0000-0000-000000000002', now() - INTERVAL '3 days');

-- Payroll tháng 4/2026 — Jessica Miller: buổi EIM-LS-01 trong tháng 4 (buổi 8 có cover → không tính vào kỳ)
INSERT INTO payroll_records (id, payroll_code, teacher_id, period_month, period_year, sessions_count, salary_per_session_snapshot, allowance_snapshot, total_salary, finalized_by, finalized_at)
SELECT
  '80000000-0000-0000-0000-000000000001',
  'EIM-PL-74001',
  '20000000-0000-0000-0000-000000000001',
  4,
  2026,
  (SELECT COUNT(*)::smallint FROM sessions s
   WHERE s.class_id = '50000000-0000-0000-0000-000000000001'
     AND s.status = 'completed'
     AND EXTRACT(MONTH FROM s.session_date) = 4
     AND EXTRACT(YEAR FROM s.session_date) = 2026
     AND NOT EXISTS (
       SELECT 1 FROM session_covers sc
       WHERE sc.session_id = s.id AND sc.status = 'completed'
     )),
  220000,
  500000,
  (SELECT COUNT(*) FROM sessions s
   WHERE s.class_id = '50000000-0000-0000-0000-000000000001'
     AND s.status = 'completed'
     AND EXTRACT(MONTH FROM s.session_date) = 4
     AND EXTRACT(YEAR FROM s.session_date) = 2026
     AND NOT EXISTS (
       SELECT 1 FROM session_covers sc
       WHERE sc.session_id = s.id AND sc.status = 'completed'
     )) * 220000 + 500000,
  '10000000-0000-0000-0000-000000000004',
  '2026-05-01 09:00:00+07';

INSERT INTO payroll_session_details (payroll_id, session_id, session_date, class_code, was_cover)
SELECT
  '80000000-0000-0000-0000-000000000001',
  s.id,
  s.session_date,
  c.class_code,
  false
FROM sessions s
JOIN classes c ON c.id = s.class_id
WHERE s.class_id = '50000000-0000-0000-0000-000000000001'
  AND s.status = 'completed'
  AND EXTRACT(MONTH FROM s.session_date) = 4
  AND EXTRACT(YEAR FROM s.session_date) = 2026
  AND NOT EXISTS (
    SELECT 1 FROM session_covers sc
    WHERE sc.session_id = s.id AND sc.status = 'completed'
  )
ORDER BY s.session_no;

INSERT INTO audit_logs (actor_id, actor_code, actor_role, actor_ip, action, entity_type, entity_id, entity_code, description, event_time) VALUES
('10000000-0000-0000-0000-000000000002', 'EIM-NHV-83014', 'ACADEMIC', '127.0.0.1', 'ENROLLMENT:created', 'enrollment', '70000000-0000-0000-0000-000000000001', NULL, 'Ghi danh Nguyễn Minh Anh vào lớp EIM-LS-01', now() - INTERVAL '30 days'),
('10000000-0000-0000-0000-000000000004', 'EIM-NKT-62740', 'ACCOUNTANT', '127.0.0.1', 'FINANCE:receipt_created', 'receipt', NULL, 'EIM-PT-10001', 'Tạo phiếu thu EIM-PT-10001 - 2.800.000đ', now() - INTERVAL '29 days'),
('10000000-0000-0000-0000-000000000002', 'EIM-NHV-83014', 'ACADEMIC', '127.0.0.1', 'ATTENDANCE:recorded', 'class', '50000000-0000-0000-0000-000000000001', 'EIM-LS-01', 'Điểm danh buổi 1 lớp EIM-LS-01', now() - INTERVAL '28 days'),
('10000000-0000-0000-0000-000000000001', 'EIM-ADM-47291', 'ADMIN', '127.0.0.1', 'CLASS:sessions_generated', 'class', '50000000-0000-0000-0000-000000000001', 'EIM-LS-01', 'Sinh 24 sessions cho lớp EIM-LS-01', now() - INTERVAL '35 days'),
('10000000-0000-0000-0000-000000000002', 'EIM-NHV-83014', 'ACADEMIC', '127.0.0.1', 'ENROLLMENT:paused', 'enrollment', '70000000-0000-0000-0000-000000000007', NULL, 'Bảo lưu enrollment của Đinh Ngọc Hân', now() - INTERVAL '5 days'),
('10000000-0000-0000-0000-000000000004', 'EIM-NKT-62740', 'ACCOUNTANT', '127.0.0.1', 'FINANCE:payroll_finalized', 'payroll', '80000000-0000-0000-0000-000000000001', 'EIM-PL-74001', 'Chốt lương tháng 4/2026 cho Jessica Miller', now() - INTERVAL '14 days'),
('20000000-0000-0000-0000-000000000001', 'EIM-GV-19283', 'TEACHER', '127.0.0.1', 'ATTENDANCE:recorded', 'class', '50000000-0000-0000-0000-000000000001', 'EIM-LS-01', 'Jessica Miller điểm danh buổi lớp EIM-LS-01', now() - INTERVAL '10 days'),
('10000000-0000-0000-0000-000000000001', 'EIM-ADM-47291', 'ADMIN', '127.0.0.1', 'CLASS:cover_assigned', 'session', NULL, NULL, 'Gán cover Emily Brown cho buổi 8 EIM-LS-01', now() - INTERVAL '11 days');

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_students;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_users;

DO $$
BEGIN
  RAISE NOTICE '── EIM Seed Complete ──';
  RAISE NOTICE 'users: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE 'students: %', (SELECT COUNT(*) FROM students);
  RAISE NOTICE 'classes: %', (SELECT COUNT(*) FROM classes);
  RAISE NOTICE 'sessions: %', (SELECT COUNT(*) FROM sessions);
  RAISE NOTICE 'enrollments: %', (SELECT COUNT(*) FROM enrollments);
  RAISE NOTICE 'attendance: %', (SELECT COUNT(*) FROM attendance);
  RAISE NOTICE 'receipts: %', (SELECT COUNT(*) FROM receipts);
  RAISE NOTICE 'payrolls: %', (SELECT COUNT(*) FROM payroll_records);
  RAISE NOTICE 'pause_req: %', (SELECT COUNT(*) FROM pause_requests);
  RAISE NOTICE 'refunds: %', (SELECT COUNT(*) FROM refund_requests);
  RAISE NOTICE 'covers: %', (SELECT COUNT(*) FROM session_covers);
  RAISE NOTICE 'makeups: %', (SELECT COUNT(*) FROM makeup_sessions);
  RAISE NOTICE 'audit: %', (SELECT COUNT(*) FROM audit_logs);
  RAISE NOTICE 'enrollment debt > 0: %', (SELECT COUNT(*) FROM enrollments e WHERE enrollment_debt(e.id) > 0);
END $$;
