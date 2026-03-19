\echo '========================================='
\echo 'Chạy migrations...'
\echo '========================================='
\i ../migrations/00_extensions.sql
\echo '✓ Extensions'
\i ../migrations/01_auth.sql
\echo '✓ Auth tables'
\i ../migrations/02_curriculum.sql
\echo '✓ Curriculum tables'
\i ../migrations/03_students_enrollment.sql
\echo '✓ Students & Enrollment tables'
\i ../migrations/04_classes.sql
\echo '✓ Classes tables'
\i ../migrations/05_sessions.sql
\echo '✓ Sessions tables'
\i ../migrations/06_feedback.sql
\echo '✓ Feedback tables'
\i ../migrations/07_trial.sql
\echo '✓ Trial tables'
\i ../migrations/08_finance.sql
\echo '✓ Finance tables'
\i ../migrations/09_system.sql
\echo '✓ System tables'
\i ../migrations/09_enrollment_blueprint_fix.sql
\echo '✓ Enrollment blueprint fix'
\i ../migrations/10_class_staff_semantics_fix.sql
\echo '✓ Class staff semantics fix'
\i ../migrations/11_split_sales_finance_role.sql
\echo '✓ Split sales/finance role'
\i ../migrations/12_add_sessions_lesson_pattern.sql
\echo '✓ Sessions lesson pattern'
\i ../migrations/13_class_staff_main_unique.sql
\echo '✓ Class staff MAIN unique'
\i ../migrations/14_enrollment_capacity_guard.sql
\echo '✓ Enrollment capacity guard'
\i ../migrations/15_journey_integrity_guards.sql
\echo '✓ Journey integrity guards'
\i ../migrations/16_finance_feeplan_invoice_snapshot.sql
\echo '✓ Finance feeplan snapshot'
\i ../migrations/17_feedback_export_jobs.sql
\echo '✓ Feedback export jobs'
\i ../migrations/18_director_read_only_policy.sql
\echo '✓ Director read-only policy'
\i ../migrations/21_director_student_read_only_policy.sql
\echo '✓ Director student read-only policy'
\i ../migrations/19_sessions_staff_integrity.sql
\echo '✓ Sessions/staff integrity guards'
\i ../migrations/20_trial_converted_integrity_guard.sql
\echo '✓ Trial converted integrity guard'
\echo 'Migrations hoàn tất!'
