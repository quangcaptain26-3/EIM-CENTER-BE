-- =============================================================================
-- SEED 11: class_schedule_suggestions (EIM_EXTENDED_V2 PROMPT SEED-3)
-- Phụ thuộc: students 006/012, program STARTERS, migration 26.
-- =============================================================================

INSERT INTO class_schedule_suggestions (student_id, program_id, unavailable_days, preferred_shift, note, created_by)
VALUES
(
  '60000000-0000-0000-0000-000000000006',
  '40000000-0000-0000-0000-000000000002',
  ARRAY[4]::SMALLINT[],
  1,
  'Phụ huynh làm ca chiều thứ 4, không đón con được',
  '10000000-0000-0000-0000-000000000002'
),
(
  '60000000-0000-0000-0000-000000000012',
  '40000000-0000-0000-0000-000000000002',
  ARRAY[2, 4]::SMALLINT[],
  NULL,
  'Phụ huynh bận T2 và T4, đề nghị xếp lớp T3+T5 hoặc T3+T6',
  '10000000-0000-0000-0000-000000000002'
);
