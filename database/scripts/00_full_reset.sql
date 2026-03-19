-- Script tổng hợp: reset + migrate + seed chạy 1 lần
-- Dùng khi muốn bắt đầu lại hoàn toàn từ đầu

\echo ''
\echo '========================================='
\echo '   EIM CENTER — FULL DATABASE RESET'
\echo '========================================='
\echo ''
\echo 'BƯỚC 1/3: Reset schema...'
\i 02_reset_schema.sql
\echo ''
\echo 'BƯỚC 2/3: Chạy migrations...'
\i 03_run_migrations.sql
\echo ''
\echo 'BƯỚC 3/3: Chạy seeds...'
\i 04_run_seeds.sql
\echo ''
\echo '========================================='
\echo '   HOÀN TẤT! Database đã sẵn sàng.'
\echo '========================================='
\echo ''

-- Verify nhanh
SELECT
  schemaname,
  tablename,
  (xpath('/row/c/text()',
    query_to_xml(format('SELECT COUNT(*) AS c FROM %I.%I', schemaname, tablename), false, true, ''))
  )[1]::text::int AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
