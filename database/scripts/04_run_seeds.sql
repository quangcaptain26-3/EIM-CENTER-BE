\echo '========================================='
\echo 'Chạy seeds...'
\echo '========================================='
\i ../seeds/01_seed_auth.sql
\echo '✓ Roles + Permissions + Users'
\i ../seeds/02_seed_curriculum.sql
\echo '✓ Programs + Units'
\i ../seeds/03_seed_classes_students.sql
\echo '✓ Classes + Students + Sessions'
\i ../seeds/04_seed_feedback_trials.sql
\echo '✓ Feedback + Trials'
\i ../seeds/05_seed_finance.sql
\echo '✓ Finance'
\i ../seeds/06_seed_system.sql
\echo '✓ Notifications + Audit logs'
\echo 'Seeds hoàn tất!'
