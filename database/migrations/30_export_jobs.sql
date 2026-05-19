-- E27: background export jobs for large datasets (>= threshold rows)
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type VARCHAR(64) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'done', 'failed')),
  progress INT NOT NULL DEFAULT 0,
  file_path TEXT,
  error_message TEXT,
  row_count INT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_created_by ON export_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
