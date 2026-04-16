-- =============================================================================
-- EIM: Run All Seeds (in dependency order)
-- Usage: psql "$DATABASE_URL" -f database/scripts/02_run_seeds.sql
-- UTF-8 files on Windows: set PGCLIENTENCODING=UTF8 if needed.
-- Lịch buổi học / payroll mẫu: xoay quanh **4/2026** (xem 05_classes + 08_sessions_attendance).
-- =============================================================================

SET client_encoding TO 'UTF8';

\i 'database/seeds/01_roles.sql'
\i 'database/seeds/02_users.sql'
\i 'database/seeds/03_facility.sql'
\i 'database/seeds/04_programs.sql'
\i 'database/seeds/05_classes.sql'
\i 'database/seeds/06_students.sql'
\i 'database/seeds/07_enrollments.sql'
\i 'database/seeds/08_sessions_attendance.sql'
\i 'database/seeds/09_finance.sql'
