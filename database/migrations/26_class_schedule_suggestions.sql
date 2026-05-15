-- =============================================================================
-- EIM Migration 26: Gợi ý lịch khi PH bận ngày — EIM_EXTENDED_V2 (PROMPT DB-2)
-- Phụ thuộc: 04_programs_classes.sql, 06_students.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS class_schedule_suggestions (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id         UUID        NOT NULL REFERENCES students(id),
  program_id         UUID        NOT NULL REFERENCES programs(id),
  unavailable_days   SMALLINT[]  NOT NULL,
  preferred_shift    SMALLINT    CHECK (preferred_shift IS NULL OR preferred_shift IN (1, 2)),
  note               TEXT,
  created_by         UUID        REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_schedule_suggestions_student
  ON class_schedule_suggestions(student_id);

CREATE INDEX IF NOT EXISTS idx_class_schedule_suggestions_program
  ON class_schedule_suggestions(program_id);

COMMENT ON TABLE class_schedule_suggestions IS
  'Phụ huynh báo ngày trong tuần không học được; dùng kèm find_compatible_classes() để tư vấn lớp.';

-- Lớp không chứa ngày “bận”; còn chỗ; cùng program; pending/active.
-- Trả đủ cột để API map sang ClassListRow + availableSlots.
CREATE OR REPLACE FUNCTION find_compatible_classes(
  p_program_id       UUID,
  p_unavailable_days SMALLINT[],
  p_shift            SMALLINT DEFAULT NULL
)
RETURNS TABLE (
  class_id             UUID,
  class_code           VARCHAR,
  program_id           UUID,
  program_code         VARCHAR,
  program_name         VARCHAR,
  room_id              UUID,
  room_code            VARCHAR,
  schedule_days        SMALLINT[],
  shift                SMALLINT,
  min_capacity         SMALLINT,
  max_capacity         SMALLINT,
  status               VARCHAR,
  start_date           DATE,
  announced_at         TIMESTAMPTZ,
  main_teacher_id      UUID,
  main_teacher_name    VARCHAR,
  enrollment_count     INT,
  completed_sessions   INT,
  total_sessions       INT,
  available_slots      INT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.class_code,
    c.program_id,
    p.code,
    p.name,
    c.room_id,
    r.room_code,
    c.schedule_days,
    c.shift,
    c.min_capacity,
    c.max_capacity,
    c.status::VARCHAR,
    c.start_date,
    c.announced_at,
    u.id,
    u.full_name::VARCHAR,
    COUNT(e.id) FILTER (
      WHERE e.status IN ('trial', 'active', 'reserved')
    )::INT,
    COALESCE(
      (SELECT COUNT(*)::INT FROM sessions s WHERE s.class_id = c.id AND s.status = 'completed'),
      0
    ),
    COALESCE(NULLIF(p.total_sessions, 0), 24)::INT,
    (c.max_capacity - COUNT(e.id) FILTER (
      WHERE e.status IN ('trial', 'active', 'reserved')
    ))::INT
  FROM classes c
  JOIN programs p ON p.id = c.program_id
  JOIN rooms r ON r.id = c.room_id
  JOIN class_staff cs ON cs.class_id = c.id AND cs.effective_to_session IS NULL
  JOIN users u ON u.id = cs.teacher_id
  LEFT JOIN enrollments e ON e.class_id = c.id
  WHERE c.program_id = p_program_id
    AND c.status IN ('pending', 'active')
    AND NOT (c.schedule_days && p_unavailable_days)
    AND (p_shift IS NULL OR c.shift = p_shift)
  GROUP BY
    c.id, c.class_code, c.program_id, p.code, p.name, c.room_id, r.room_code,
    c.schedule_days, c.shift, c.min_capacity, c.max_capacity, c.status,
    c.start_date, c.announced_at, u.id, u.full_name, p.total_sessions
  HAVING c.max_capacity - COUNT(e.id) FILTER (
    WHERE e.status IN ('trial', 'active', 'reserved')
  ) > 0
  ORDER BY 20 DESC;
$$;

COMMENT ON FUNCTION find_compatible_classes(UUID, SMALLINT[], SMALLINT) IS
  'Lớp cùng program, lịch không trùng unavailable_days, còn slot; optional lọc ca.';
