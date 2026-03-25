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
\i ../migrations/07_feedback_columns.sql
\echo '✓ Feedback columns (language_usage, note)'
\i ../migrations/08_trial.sql
\echo '✓ Trial tables'
\i ../migrations/09_finance.sql
\echo '✓ Finance tables'
\i ../migrations/10_system.sql
\echo '✓ System tables'
\i ../migrations/11_enrollment_blueprint_fix.sql
\echo '✓ Enrollment blueprint fix'
\i ../migrations/12_class_staff_semantics_fix.sql
\echo '✓ Class staff semantics fix'
\i ../migrations/13_split_sales_finance_role.sql
\echo '✓ Split sales/finance role'
\i ../migrations/14_add_sessions_lesson_pattern.sql
\echo '✓ Sessions lesson pattern'
\i ../migrations/15_class_staff_main_unique.sql
\echo '✓ Class staff MAIN unique'
\i ../migrations/16_enrollment_capacity_guard.sql
\echo '✓ Enrollment capacity guard'
\i ../migrations/17_journey_integrity_guards.sql
\echo '✓ Journey integrity guards'
\i ../migrations/18_finance_feeplan_invoice_snapshot.sql
\echo '✓ Finance feeplan snapshot'
\i ../migrations/19_feedback_export_jobs.sql
\echo '✓ Feedback export jobs'
\i ../migrations/20_director_read_only_policy.sql
\echo '✓ Director read-only policy'
\i ../migrations/23_director_student_read_only_policy.sql
\echo '✓ Director student read-only policy'
\i ../migrations/21_sessions_staff_integrity.sql
\echo '✓ Sessions/staff integrity guards'
\i ../migrations/22_trial_converted_integrity_guard.sql
\echo '✓ Trial converted integrity guard'
\i ../migrations/24_session_status_and_reschedule_changed_by.sql
\echo '✓ Session status + reschedule changed_by'
\i ../migrations/25_enrollment_one_active_per_student.sql
\echo '✓ Enrollment one active per student'
\i ../migrations/26_fks_constraints.sql
\echo '✓ FK constraints (reserved)'
\i ../migrations/27_promotion_schema.sql
\echo '✓ Promotion schema (sort_order, PENDING, source_enrollment_id)'
\i ../migrations/28_transfer_unit_lesson.sql
\echo '✓ Transfer unit/lesson tracking'
\i ../migrations/29_trial_date_timestamptz.sql
\echo '✓ Trial trial_date: DATE → TIMESTAMPTZ (lưu cả giờ)'
\echo 'Migrations hoàn tất!'
