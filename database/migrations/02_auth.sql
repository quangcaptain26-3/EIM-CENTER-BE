-- =============================================================================
-- EIM Migration 02: Auth — roles, users, sessions, salary logs
-- Depends on: 01_extensions.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(20) UNIQUE NOT NULL,  -- ADMIN | ACADEMIC | ACCOUNTANT | TEACHER
  name        VARCHAR(100) NOT NULL,
  permissions JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_code     VARCHAR(20) UNIQUE NOT NULL,  -- EIM-ADM/NHV/NKT/GV-xxxxx
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id       UUID        NOT NULL REFERENCES roles(id),
  is_active     BOOLEAN     NOT NULL DEFAULT true,

  -- Thông tin cá nhân
  full_name     VARCHAR(200) NOT NULL,
  gender        VARCHAR(10)  CHECK (gender IN ('male','female','other')),
  dob           DATE,
  phone         VARCHAR(20),
  address       TEXT,

  -- Pháp lý
  cccd          VARCHAR(20)  UNIQUE,
  nationality   VARCHAR(100) DEFAULT 'Việt Nam',
  ethnicity     VARCHAR(100),
  religion      VARCHAR(100),

  -- Nghề nghiệp
  education_level VARCHAR(100),
  major           VARCHAR(200),
  start_date      DATE,

  -- Lương (TEACHER: salary_per_session; STAFF: monthly implied)
  salary_per_session DECIMAL(12,0),
  allowance          DECIMAL(12,0) DEFAULT 0,

  -- Audit
  created_by  UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ             -- soft delete
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- salary_change_logs — lịch sử thay đổi lương
-- ---------------------------------------------------------------------------
CREATE TABLE salary_change_logs (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID        NOT NULL REFERENCES users(id),
  old_salary_per_session DECIMAL(12,0),
  new_salary_per_session DECIMAL(12,0),
  old_allowance          DECIMAL(12,0),
  new_allowance          DECIMAL(12,0),
  changed_by             UUID        NOT NULL REFERENCES users(id),
  changed_at             TIMESTAMPTZ DEFAULT now(),
  reason                 TEXT        NOT NULL
);

-- ---------------------------------------------------------------------------
-- user_sessions — refresh token store
-- ---------------------------------------------------------------------------
CREATE TABLE user_sessions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id),
  token_hash VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_role_id      ON users(role_id);
CREATE INDEX idx_users_deleted_at   ON users(deleted_at);
CREATE INDEX idx_user_sessions_token   ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
