import { Pool } from 'pg';
import { env } from '../config/env';
import { HolidayPgRepo } from '../infrastructure/db/repositories/classes/holiday.pg.repo';

/**
 * Shared PostgreSQL connection pool.
 *
 * Được inject vào tất cả repositories — không bao giờ tạo Pool riêng lẻ.
 * Graceful shutdown: gọi `db.end()` khi process nhận SIGTERM/SIGINT (xem main.ts).
 */
export const db = new Pool({
  connectionString:  env.DATABASE_URL,
  max:               20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/** Ngày lễ — generate-sessions, reschedule-session */
export const holidayRepo = new HolidayPgRepo(db);

// Log lỗi pool-level để không bị silent fail
db.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});
