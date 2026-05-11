-- =============================================================================
-- EIM Migration 01: Extensions & Shared Functions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Hàm sinh EIM code: EIM-{prefix}-{5 chữ số}
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_eim_code(prefix TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'EIM-' || prefix || '-' || LPAD(FLOOR(random() * 90000 + 10000)::TEXT, 5, '0');
END $$;

-- ---------------------------------------------------------------------------
-- Trigger function: tự động set updated_at = now()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- effective_teacher_id  -> xem 05_sessions.sql (sau khi có sessions, session_covers)
-- enrollment_debt      -> xem 08_finance.sql (sau khi có enrollments, receipts)
