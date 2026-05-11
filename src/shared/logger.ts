import pino from 'pino';

/** Logger dùng chung (usecase, infrastructure) — tránh phụ thuộc console trần. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  name: 'eim-backend',
});
