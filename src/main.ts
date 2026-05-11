import { env } from './config/env';
import app from './server';
import { db } from './bootstrap/container';
import { ExpireReservedEnrollmentsUseCase } from './application/students/usecases/expire-reserved-enrollments.usecase';
import pino from 'pino';

const DAY_MS = 24 * 60 * 60 * 1000;

const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const server = app.listen(env.PORT, () => {
  logger.info(`EIM Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

if (env.ENABLE_SCHEDULED_JOBS) {
  const expireReserved = new ExpireReservedEnrollmentsUseCase(db);
  const runExpireReserved = () => {
    expireReserved
      .execute()
      .then((r) => {
        if (r.expiredCount > 0) {
          logger.info({ expiredCount: r.expiredCount }, 'expire_reserved_enrollments');
        }
      })
      .catch((err) => {
        logger.error({ err }, 'expire_reserved_enrollments failed');
      });
  };
  runExpireReserved();
  const interval = setInterval(runExpireReserved, DAY_MS);
  if (typeof (interval as NodeJS.Timeout).unref === 'function') {
    (interval as NodeJS.Timeout).unref();
  }
  logger.info('Scheduled jobs enabled: expire_reserved_enrollments (daily, Q32)');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Shutting down gracefully…`);

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error closing HTTP server');
    } else {
      logger.info('HTTP server closed');
    }

    try {
      await db.end();
      logger.info('Database pool closed');
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error closing database pool');
    }

    process.exit(0);
  });

  // Force exit after 10 s if graceful shutdown hangs
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  shutdown('uncaughtException').catch(() => process.exit(1));
});
