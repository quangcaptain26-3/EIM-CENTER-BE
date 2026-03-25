-- Mô tả: Bảng system_export_jobs cho job xuất dữ liệu (feedback, v.v.).

SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS system_export_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type         TEXT NOT NULL,
    owner_user_id    UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
    status           TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    progress         INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    attempts         INTEGER NOT NULL DEFAULT 0,
    max_attempts     INTEGER NOT NULL DEFAULT 3,
    file_name        TEXT NOT NULL,
    file_path        TEXT NULL,
    error            TEXT NULL,
    cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at       TIMESTAMPTZ NULL,
    finished_at      TIMESTAMPTZ NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_export_jobs_owner_created
    ON system_export_jobs (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_export_jobs_type_status_created
    ON system_export_jobs (job_type, status, created_at DESC);

