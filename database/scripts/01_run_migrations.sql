-- =============================================================================
-- EIM: Run All Migrations (in order)
-- Usage: psql "$DATABASE_URL" -f database/scripts/01_run_migrations.sql
-- Note:  psql must be launched from the project root so relative paths work.
-- UTF-8 files on Windows: set PGCLIENTENCODING=UTF8 if needed.
-- =============================================================================

SET client_encoding TO 'UTF8';

\i 'database/migrations/01_extensions.sql'
\i 'database/migrations/02_auth.sql'
\i 'database/migrations/03_facility.sql'
\i 'database/migrations/04_programs_classes.sql'
\i 'database/migrations/05_sessions.sql'
\i 'database/migrations/06_students.sql'
\i 'database/migrations/07_attendance.sql'
\i 'database/migrations/08_finance.sql'
\i 'database/migrations/09_payroll.sql'
\i 'database/migrations/10_audit_search.sql'
\i 'database/migrations/11_triggers_constraints.sql'
\i 'database/migrations/12_students_deleted_at.sql'
