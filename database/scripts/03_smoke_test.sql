-- =============================================================================
-- EIM: Smoke Test — quick row-count verify after migrate + seed
-- Usage: psql "$DATABASE_URL" -f database/scripts/03_smoke_test.sql
-- =============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM roles;       RAISE NOTICE 'roles:       % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM users;       RAISE NOTICE 'users:       % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM programs;    RAISE NOTICE 'programs:    % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM classes;     RAISE NOTICE 'classes:     % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM sessions;    RAISE NOTICE 'sessions:    % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM students;    RAISE NOTICE 'students:    % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM enrollments; RAISE NOTICE 'enrollments: % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM attendance;  RAISE NOTICE 'attendance:  % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM receipts;    RAISE NOTICE 'receipts:    % rows', v_count;
  SELECT COUNT(*) INTO v_count FROM audit_logs;  RAISE NOTICE 'audit_logs:  % rows', v_count;
END $$;
