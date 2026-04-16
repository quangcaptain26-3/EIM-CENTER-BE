-- =============================================================================
-- SEED 08: sessions, điểm danh, cover, học bù, bảo lưu
-- Map thứ: PG DOW 0=CN → bỏ; 1=T2..6=T7 theo mảng schedule_days
-- Phải khớp start_date trong seed 05_classes (khoảng 4/2026 — demo lịch dạy)
-- =============================================================================

-- 24 buổi / lớp active; bỏ ngày lỗi trong holidays; trạng thái completed theo cấu hình
DO $$
DECLARE
  r RECORD;
  cur_date DATE;
  session_no SMALLINT;
  dow_pg SMALLINT;
  dow_vn SMALLINT;
  is_holiday BOOLEAN;
  v_class_id UUID;
  v_teacher_id UUID;
  v_shift SMALLINT;
  v_days SMALLINT[];
  v_start DATE;
  v_completed SMALLINT;
  sess_status VARCHAR(20);
BEGIN
  FOR r IN
    SELECT * FROM (
      VALUES
        ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 1::smallint, ARRAY[2, 4]::smallint[], '2026-04-06'::date, 10::smallint),
        ('50000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 2::smallint, ARRAY[3, 5]::smallint[], '2026-04-07'::date, 8::smallint),
        ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, 1::smallint, ARRAY[3, 6]::smallint[], '2026-04-01'::date, 16::smallint),
        ('50000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, 2::smallint, ARRAY[2, 5]::smallint[], '2026-04-02'::date, 20::smallint),
        ('50000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 1::smallint, ARRAY[4, 6]::smallint[], '2026-04-08'::date, 5::smallint)
    ) AS t(class_id, teacher_id, shift, days, start_date, completed)
  LOOP
    v_class_id := r.class_id;
    v_teacher_id := r.teacher_id;
    v_shift := r.shift;
    v_days := r.days;
    v_start := r.start_date;
    v_completed := r.completed;
    session_no := 1;
    cur_date := v_start;

    WHILE session_no <= 24 LOOP
      dow_pg := EXTRACT(DOW FROM cur_date)::SMALLINT;
      dow_vn := CASE dow_pg
        WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6 WHEN 6 THEN 7
        ELSE 0
      END;

      IF dow_vn = ANY (v_days) THEN
        SELECT EXISTS (
          SELECT 1 FROM holidays h
          WHERE (h.is_recurring = false AND h.holiday_date = cur_date)
             OR (h.is_recurring = true
                 AND EXTRACT(MONTH FROM h.holiday_date) = EXTRACT(MONTH FROM cur_date)
                 AND EXTRACT(DAY FROM h.holiday_date) = EXTRACT(DAY FROM cur_date))
        ) INTO is_holiday;

        IF NOT is_holiday THEN
          sess_status := CASE WHEN session_no <= v_completed THEN 'completed' ELSE 'pending' END;
          INSERT INTO sessions (class_id, teacher_id, session_no, session_date, shift, status)
          VALUES (v_class_id, v_teacher_id, session_no, cur_date, v_shift, sess_status);
          session_no := session_no + 1;
        END IF;
      END IF;

      cur_date := cur_date + 1;
      IF cur_date > v_start + 800 THEN
        RAISE EXCEPTION 'Seed: không đủ ngày lịch cho lớp %', v_class_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Cover buổi 8 — Emily Brown thay Jessica Miller (EIM-LS-01)
INSERT INTO session_covers (session_id, cover_teacher_id, assigned_by, reason, status, confirmed_at)
SELECT s.id,
  '20000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000002',
  'Jessica Miller bị ốm, cần người cover gấp',
  'completed',
  now() - INTERVAL '15 days'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000001'
  AND s.session_no = 8;

-- Điểm danh: active + paused (không gồm dropped/trial)
DO $$
DECLARE
  v_session RECORD;
  v_enrollment RECORD;
  v_status VARCHAR(30);
  v_seed INT;
BEGIN
  FOR v_session IN
    SELECT s.id AS session_id, s.class_id, s.session_no
    FROM sessions s
    WHERE s.status = 'completed'
    ORDER BY s.class_id, s.session_no
  LOOP
    FOR v_enrollment IN
      SELECT e.id AS enrollment_id, e.student_id
      FROM enrollments e
      WHERE e.class_id = v_session.class_id
        AND e.status IN ('active', 'paused')
      ORDER BY e.id
    LOOP
      v_seed := (abs(hashtext(v_enrollment.enrollment_id::text)) + v_session.session_no * 13) % 10;
      v_status := CASE v_seed
        WHEN 0 THEN 'late'
        WHEN 1 THEN 'absent_excused'
        ELSE 'present'
      END;

      INSERT INTO attendance (session_id, student_id, enrollment_id, status, recorded_by, recorded_at)
      VALUES (
        v_session.session_id,
        v_enrollment.student_id,
        v_enrollment.enrollment_id,
        v_status,
        '10000000-0000-0000-0000-000000000002',
        now() - INTERVAL '2 days' * random()
      );
    END LOOP;
  END LOOP;
END $$;

-- EIM-LS-01: đủ 10 buổi tính buổi (present) — trừ 001 buổi 5 (học bù)
UPDATE attendance a
SET status = 'present'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000001'
  AND s.status = 'completed'
  AND a.session_id = s.id
  AND a.enrollment_id IN (
    '70000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000003',
    '70000000-0000-0000-0000-000000000004',
    '70000000-0000-0000-0000-000000000005',
    '70000000-0000-0000-0000-000000000006',
    '70000000-0000-0000-0000-000000000008'
  )
  AND NOT (a.enrollment_id = '70000000-0000-0000-0000-000000000001' AND s.session_no = 5);

UPDATE attendance a
SET status = 'absent_excused'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000001'
  AND a.session_id = s.id
  AND s.class_id = '50000000-0000-0000-0000-000000000001'
  AND s.session_no = 5;

-- HS bảo lưu (700…007): 6 buổi đầu có mặt, các buổi sau vắng có phép
UPDATE attendance a
SET status = 'present'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000007'
  AND a.session_id = s.id
  AND s.session_no <= 6;

UPDATE attendance a
SET status = 'absent_excused'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000007'
  AND a.session_id = s.id
  AND s.session_no > 6;

-- HS dropped (700…013): chỉ 2 buổi đầu
DELETE FROM attendance a
USING sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000013'
  AND a.session_id = s.id
  AND s.class_id = '50000000-0000-0000-0000-000000000002'
  AND s.session_no > 2;

INSERT INTO attendance (session_id, student_id, enrollment_id, status, recorded_by)
SELECT s.id,
  '60000000-0000-0000-0000-000000000013',
  '70000000-0000-0000-0000-000000000013',
  'present',
  '10000000-0000-0000-0000-000000000002'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000002'
  AND s.status = 'completed'
  AND s.session_no = 1
ON CONFLICT (session_id, student_id) DO NOTHING;

INSERT INTO attendance (session_id, student_id, enrollment_id, status, recorded_by)
SELECT s.id,
  '60000000-0000-0000-0000-000000000013',
  '70000000-0000-0000-0000-000000000013',
  'late',
  '10000000-0000-0000-0000-000000000002'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000002'
  AND s.status = 'completed'
  AND s.session_no = 2
ON CONFLICT (session_id, student_id) DO NOTHING;

-- Học thử (700…014): 1 buổi
INSERT INTO attendance (session_id, student_id, enrollment_id, status, recorded_by)
SELECT s.id,
  '60000000-0000-0000-0000-000000000014',
  '70000000-0000-0000-0000-000000000014',
  'present',
  '10000000-0000-0000-0000-000000000002'
FROM sessions s
WHERE s.class_id = '50000000-0000-0000-0000-000000000002'
  AND s.status = 'completed'
  AND s.session_no = 1
ON CONFLICT (session_id, student_id) DO NOTHING;

-- Vắng có phép buổi 5 — Nguyễn Minh Anh (makeup)
UPDATE attendance a
SET status = 'absent_excused'
FROM sessions s
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000001'
  AND a.session_id = s.id
  AND s.class_id = '50000000-0000-0000-0000-000000000001'
  AND s.session_no = 5;

INSERT INTO makeup_sessions (makeup_code, original_session_id, original_attendance_id, student_id, enrollment_id, makeup_date, room_id, teacher_id, shift, status, note, created_by)
SELECT
  'EIM-BB-11001',
  a.session_id,
  a.id,
  a.student_id,
  a.enrollment_id,
  '2026-05-06'::date,
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  1,
  'pending',
  'Học bù cho buổi vắng có phép',
  '10000000-0000-0000-0000-000000000002'
FROM attendance a
JOIN sessions s ON s.id = a.session_id
WHERE a.enrollment_id = '70000000-0000-0000-0000-000000000001'
  AND s.session_no = 5
  AND a.status = 'absent_excused'
LIMIT 1;

-- Yêu cầu bảo lưu: 1 pending, 1 approved
INSERT INTO pause_requests (request_code, enrollment_id, requested_by, reason, sessions_attended_at_request, status, created_at)
VALUES (
  'EIM-BL-29001',
  '70000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000002',
  'Phụ huynh báo con bị bệnh, cần bảo lưu 1 tháng để điều trị',
  8,
  'pending',
  now() - INTERVAL '2 days'
);

INSERT INTO pause_requests (request_code, enrollment_id, requested_by, reason, sessions_attended_at_request, status, reviewed_by, reviewed_at, review_note)
VALUES (
  'EIM-BL-29002',
  '70000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000002',
  'Gia đình đi du lịch dài ngày',
  6,
  'approved',
  '10000000-0000-0000-0000-000000000001',
  now() - INTERVAL '10 days',
  'Đã duyệt. Học viên có thể quay lại trong 3 tháng.'
);

-- Giữ nguyên session_date theo lịch seed (ổn định khi xem theo tháng, VD 4/2026 trên “Lịch dạy”)
