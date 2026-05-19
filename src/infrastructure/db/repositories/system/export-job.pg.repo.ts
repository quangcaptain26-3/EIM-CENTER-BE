import { Pool } from 'pg';
import type { ExportType } from '../../../../application/system/dtos/import-export.dto';

export type ExportJobStatus = 'processing' | 'done' | 'failed';

export interface ExportJobRow {
  id: string;
  exportType: ExportType;
  filters: Record<string, unknown>;
  status: ExportJobStatus;
  progress: number;
  filePath: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

function mapRow(r: Record<string, unknown>): ExportJobRow {
  return {
    id: String(r.id),
    exportType: String(r.export_type) as ExportType,
    filters: (r.filters as Record<string, unknown>) ?? {},
    status: String(r.status) as ExportJobStatus,
    progress: Number(r.progress) || 0,
    filePath: r.file_path ? String(r.file_path) : null,
    errorMessage: r.error_message ? String(r.error_message) : null,
    rowCount: r.row_count != null ? Number(r.row_count) : null,
    createdBy: String(r.created_by),
    createdAt: r.created_at as Date,
    updatedAt: r.updated_at as Date,
    completedAt: (r.completed_at as Date) ?? null,
  };
}

export class ExportJobPgRepo {
  constructor(private readonly db: Pool) {}

  async create(input: {
    exportType: ExportType;
    filters: Record<string, unknown>;
    createdBy: string;
    rowCount?: number;
  }): Promise<ExportJobRow> {
    const { rows } = await this.db.query(
      `
      INSERT INTO export_jobs (export_type, filters, created_by, row_count)
      VALUES ($1, $2::jsonb, $3, $4)
      RETURNING *
      `,
      [input.exportType, JSON.stringify(input.filters), input.createdBy, input.rowCount ?? null],
    );
    return mapRow(rows[0] as Record<string, unknown>);
  }

  async findById(id: string): Promise<ExportJobRow | null> {
    const { rows } = await this.db.query(`SELECT * FROM export_jobs WHERE id = $1`, [id]);
    if (!rows[0]) return null;
    return mapRow(rows[0] as Record<string, unknown>);
  }

  async findByIdForUser(id: string, userId: string): Promise<ExportJobRow | null> {
    const { rows } = await this.db.query(
      `SELECT * FROM export_jobs WHERE id = $1 AND created_by = $2`,
      [id, userId],
    );
    if (!rows[0]) return null;
    return mapRow(rows[0] as Record<string, unknown>);
  }

  async markDone(id: string, filePath: string, rowCount: number): Promise<void> {
    await this.db.query(
      `
      UPDATE export_jobs
      SET status = 'done', file_path = $2, progress = 100, row_count = $3,
          completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [id, filePath, rowCount],
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.db.query(
      `
      UPDATE export_jobs
      SET status = 'failed', error_message = $2, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [id, errorMessage],
    );
  }
}
