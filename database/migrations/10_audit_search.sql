-- =============================================================================
-- EIM Migration 10: Audit Logs & Full-Text Search Views
-- Depends on: 01_extensions.sql, 02_auth.sql, 06_students.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs — append-only event log cho toàn hệ thống
-- Format action: DOMAIN:event  ví dụ: AUTH:login, FINANCE:receipt_created
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_time  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID,                   -- nullable: system events không có actor
  actor_code  VARCHAR(20),            -- snapshot tại thời điểm event
  actor_role  VARCHAR(20),            -- snapshot
  actor_ip    VARCHAR(45),
  actor_agent TEXT,
  action      VARCHAR(100) NOT NULL,  -- ví dụ: AUTH:login, CLASS:cover_assigned
  entity_type VARCHAR(50),            -- ví dụ: user, class, enrollment
  entity_id   UUID,
  entity_code VARCHAR(20),            -- snapshot
  old_values  JSONB,
  new_values  JSONB,
  diff        JSONB,                  -- chỉ các fields thực sự thay đổi
  description TEXT,                   -- văn bản ngắn tiếng Việt
  metadata    JSONB,
  request_id  UUID
  -- Append-only: KHÔNG UPDATE, KHÔNG DELETE (enforce bởi trigger trong 11_triggers)
);

-- ---------------------------------------------------------------------------
-- audit_logs_archive — chứa logs > 90 ngày (move định kỳ bằng job/pg_cron)
-- LIKE ... INCLUDING ALL kế thừa constraints + indexes
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);

-- ---------------------------------------------------------------------------
-- Indexes cho audit_logs (query theo thời gian, actor, entity, action)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_audit_event_time ON audit_logs(event_time DESC);
CREATE INDEX idx_audit_actor_id   ON audit_logs(actor_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Materialized view: tìm kiếm học sinh (FTS + phone)
-- REFRESH CONCURRENTLY sau khi insert/update students
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_search_students AS
SELECT
  s.id,
  s.student_code,
  s.full_name,
  s.dob,
  s.parent_name,
  s.parent_phone,
  s.parent_phone2,
  s.school_name,
  to_tsvector('simple', unaccent(
    coalesce(s.full_name,   '') || ' ' ||
    coalesce(s.parent_name, '') || ' ' ||
    coalesce(s.school_name, '')
  )) AS search_vector
FROM students s
WHERE s.is_active = true;

CREATE UNIQUE INDEX idx_mv_students_id     ON mv_search_students(id);
CREATE INDEX        idx_mv_students_fts    ON mv_search_students USING GIN(search_vector);
CREATE INDEX        idx_mv_students_phone  ON mv_search_students(parent_phone);
CREATE INDEX        idx_mv_students_phone2 ON mv_search_students(parent_phone2);

-- ---------------------------------------------------------------------------
-- Materialized view: tìm kiếm nhân viên (FTS + cccd)
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_search_users AS
SELECT
  u.id,
  u.user_code,
  u.full_name,
  u.phone,
  u.cccd,
  r.code AS role_code,
  to_tsvector('simple', unaccent(
    coalesce(u.full_name, '') || ' ' ||
    coalesce(u.phone,     '')
  )) AS search_vector
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_mv_users_id   ON mv_search_users(id);
CREATE INDEX        idx_mv_users_fts  ON mv_search_users USING GIN(search_vector);
CREATE INDEX        idx_mv_users_cccd ON mv_search_users(cccd);
