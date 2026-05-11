import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';

/**
 * Đếm file migration `.sql` trên đĩa (theo `process.cwd()/database/migrations`).
 * Dùng cho /health để deploy có thể đối chiếu nhanh với repo — không thay cho kiểm tra schema đầy đủ (xem db:smoke).
 * Muốn đổi đường dẫn migration: sửa `join` trong hàm này.
 */
function countMigrationSqlFilesOnDisk(): number {
  try {
    const dir = join(process.cwd(), 'database', 'migrations');
    return readdirSync(dir).filter((f) => f.endsWith('.sql') && !f.startsWith('.')).length;
  } catch {
    return -1;
  }
}

export function createHealthHandler(db: Pool) {
  return async (_req: Request, res: Response): Promise<void> => {
    const migrationsSqlFiles = countMigrationSqlFilesOnDisk();
    try {
      await db.query('SELECT 1');
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: { connected: true },
        migrations: { sqlFilesOnDisk: migrationsSqlFiles },
      });
    } catch {
      res.status(503).json({
        status: 'degraded',
        code: 'HEALTH_DB_UNAVAILABLE',
        message: 'Không kết nối được cơ sở dữ liệu',
        timestamp: new Date().toISOString(),
        database: { connected: false },
        migrations: { sqlFilesOnDisk: migrationsSqlFiles },
      });
    }
  };
}
