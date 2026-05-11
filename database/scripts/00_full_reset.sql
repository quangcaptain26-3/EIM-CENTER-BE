-- =============================================================================
-- EIM: Full Schema Reset
-- WARNING: Drops ALL tables, functions, triggers, types in public schema.
--          Run only in development / CI environment.
-- =============================================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

COMMENT ON SCHEMA public IS 'EIM Final Database - Reset';
