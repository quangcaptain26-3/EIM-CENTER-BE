import { createWriteStream } from "fs";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import type { Writable } from "stream";
import { pool } from "../../../../infrastructure/db/pg-pool";

type ExportJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface ExportJobRecord<TPayload = unknown> {
  id: string;
  ownerUserId: string;
  payload: TPayload;
  status: ExportJobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  filePath?: string;
  fileName: string;
  cancelRequested: boolean;
}

type Runner<TPayload> = (args: {
  payload: TPayload;
  writable: Writable;
  isCancelled: () => boolean;
  setProgress: (progress: number) => Promise<void>;
}) => Promise<void>;

export class FeedbackExportJobsStore {
  private static instance: FeedbackExportJobsStore | null = null;
  private readonly outDir = join(tmpdir(), "eim-feedback-exports");
  private readonly activeWriters = new Map<string, Writable>();
  private readonly initPromise: Promise<void>;

  private constructor() {
    this.initPromise = this.initialize();
  }

  static getInstance(): FeedbackExportJobsStore {
    if (!this.instance) {
      this.instance = new FeedbackExportJobsStore();
    }
    return this.instance;
  }

  async createAndStart<TPayload>(args: {
    ownerUserId: string;
    payload: TPayload;
    fileName: string;
    maxAttempts?: number;
    runner: Runner<TPayload>;
  }): Promise<ExportJobRecord<TPayload>> {
    await this.initPromise;
    await this.cleanupOldJobs();

    const id = randomUUID();
    const created = await pool.query(
      `INSERT INTO system_export_jobs
        (id, job_type, owner_user_id, payload, status, progress, attempts, max_attempts, file_name, cancel_requested)
       VALUES ($1, 'FEEDBACK_CLASS_EXPORT', $2, $3::jsonb, 'queued', 0, 0, $4, $5, FALSE)
       RETURNING *`,
      [id, args.ownerUserId, JSON.stringify(args.payload), args.maxAttempts ?? 3, args.fileName],
    );
    const job = this.mapRow<TPayload>(created.rows[0]);

    void this.runJob(job.id, args.runner);
    return job;
  }

  async get(jobId: string): Promise<ExportJobRecord | undefined> {
    await this.initPromise;
    const result = await pool.query(`SELECT * FROM system_export_jobs WHERE id = $1`, [jobId]);
    if (result.rows.length === 0) return undefined;
    return this.mapRow(result.rows[0]);
  }

  async requestCancel(jobId: string): Promise<ExportJobRecord | undefined> {
    await this.initPromise;
    const updated = await pool.query(
      `UPDATE system_export_jobs
       SET cancel_requested = TRUE,
           status = CASE WHEN status = 'queued' THEN 'cancelled' ELSE status END,
           progress = CASE WHEN status = 'queued' THEN 100 ELSE progress END,
           finished_at = CASE WHEN status = 'queued' THEN NOW() ELSE finished_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId],
    );
    if (updated.rows.length === 0) return undefined;

    const writer = this.activeWriters.get(jobId);
    if (writer) {
      writer.destroy(new Error("JOB_CANCELLED"));
    }

    return this.mapRow(updated.rows[0]);
  }

  async retry(jobId: string, runner: Runner<any>): Promise<ExportJobRecord | undefined> {
    await this.initPromise;
    const base = await this.get(jobId);
    if (!base) return undefined;
    if (base.attempts >= base.maxAttempts) return base;

    if (base.filePath) {
      await rm(base.filePath, { force: true });
    }

    const reset = await pool.query(
      `UPDATE system_export_jobs
       SET cancel_requested = FALSE,
           status = 'queued',
           progress = 0,
           error = NULL,
           started_at = NULL,
           finished_at = NULL,
           file_path = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId],
    );
    if (reset.rows.length === 0) return undefined;

    void this.runJob(jobId, runner);
    return this.mapRow(reset.rows[0]);
  }

  private async runJob<TPayload>(jobId: string, runner: Runner<TPayload>): Promise<void> {
    const job = await this.get(jobId);
    if (!job || job.status === "cancelled") return;

    await pool.query(
      `UPDATE system_export_jobs
       SET status = 'running', progress = 10, started_at = NOW(), attempts = attempts + 1, updated_at = NOW()
       WHERE id = $1`,
      [jobId],
    );

    const filePath = join(this.outDir, `${jobId}.xlsx`);
    const out = createWriteStream(filePath);
    this.activeWriters.set(jobId, out);

    const setProgress = async (progress: number): Promise<void> => {
      await pool.query(
        `UPDATE system_export_jobs
         SET progress = GREATEST(LEAST($2, 99), progress), updated_at = NOW()
         WHERE id = $1 AND status = 'running'`,
        [jobId, progress],
      );
    };

    try {
      await runner({
        payload: job.payload as TPayload,
        writable: out,
        isCancelled: () => false,
        setProgress,
      });
      out.end();

      const latest = await this.get(jobId);
      if (!latest) return;
      if (latest.cancelRequested) {
        await rm(filePath, { force: true });
        await pool.query(
          `UPDATE system_export_jobs
           SET status = 'cancelled', progress = 100, finished_at = NOW(), file_path = NULL, updated_at = NOW()
           WHERE id = $1`,
          [jobId],
        );
      } else {
        await pool.query(
          `UPDATE system_export_jobs
           SET status = 'completed', progress = 100, finished_at = NOW(), file_path = $2, updated_at = NOW()
           WHERE id = $1`,
          [jobId, filePath],
        );
      }
    } catch (error: any) {
      await rm(filePath, { force: true });
      const latest = await this.get(jobId);
      const wasCancelled = latest?.cancelRequested === true || error?.message === "JOB_CANCELLED";

      if (wasCancelled) {
        await pool.query(
          `UPDATE system_export_jobs
           SET status = 'cancelled', progress = 100, finished_at = NOW(), file_path = NULL, updated_at = NOW()
           WHERE id = $1`,
          [jobId],
        );
      } else {
        await pool.query(
          `UPDATE system_export_jobs
           SET status = 'failed', progress = 100, error = $2, finished_at = NOW(), file_path = NULL, updated_at = NOW()
           WHERE id = $1`,
          [jobId, error?.message ?? "Export job failed"],
        );
      }
    } finally {
      this.activeWriters.delete(jobId);
    }
  }

  private async initialize(): Promise<void> {
    await mkdir(this.outDir, { recursive: true });
    await pool.query(
      `UPDATE system_export_jobs
       SET status = 'failed',
           error = COALESCE(error, 'Job bị gián đoạn do server restart'),
           finished_at = NOW(),
           updated_at = NOW()
       WHERE job_type = 'FEEDBACK_CLASS_EXPORT' AND status IN ('queued', 'running')`,
    );
  }

  private async cleanupOldJobs(): Promise<void> {
    const stale = await pool.query(
      `SELECT id, file_path
       FROM system_export_jobs
       WHERE created_at < NOW() - INTERVAL '24 hours'`,
    );
    for (const row of stale.rows) {
      if (row.file_path) {
        await rm(String(row.file_path), { force: true });
      }
    }
    await pool.query(
      `DELETE FROM system_export_jobs
       WHERE created_at < NOW() - INTERVAL '24 hours'`,
    );
  }

  private mapRow<TPayload = unknown>(row: any): ExportJobRecord<TPayload> {
    return {
      id: String(row.id),
      ownerUserId: String(row.owner_user_id),
      payload: row.payload as TPayload,
      status: row.status as ExportJobStatus,
      progress: Number(row.progress ?? 0),
      attempts: Number(row.attempts ?? 0),
      maxAttempts: Number(row.max_attempts ?? 3),
      createdAt: new Date(row.created_at).toISOString(),
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
      finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : undefined,
      error: row.error ?? undefined,
      filePath: row.file_path ?? undefined,
      fileName: String(row.file_name),
      cancelRequested: Boolean(row.cancel_requested),
    };
  }
}

