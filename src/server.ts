import express, {
  Request,
  Response,
  NextFunction,
  Router,
} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { DatabaseError } from 'pg';
import { env } from './config/env';
import { AppError } from './shared/errors/app-error';
import { ERROR_CODES } from './shared/errors/error-codes';

// ---------------------------------------------------------------------------
// App instance
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// 1. Security headers
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// 2. CORS
// ---------------------------------------------------------------------------
const allowedOrigins =
  env.NODE_ENV === 'development'
    ? '*'
    : (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// 3. Body parser
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// 4. HTTP request logger (pino-http)
// ---------------------------------------------------------------------------
app.use(
  pinoHttp({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  })
);

// ---------------------------------------------------------------------------
// 5. Rate limiters
// ---------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000, // 15 min
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  statusCode:      429,
  message:         { code: ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'Too many requests, please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  statusCode:      429,
  message:         { code: ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'Too many login attempts, please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/v1/auth/login', loginLimiter);

import apiRouter from './presentation/http/routes';

// ---------------------------------------------------------------------------
// 6. API router
// ---------------------------------------------------------------------------
app.use('/api/v1', apiRouter);

// ---------------------------------------------------------------------------
// 7. 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code:    ERROR_CODES.NOT_FOUND,
    message: 'The requested resource was not found.',
  });
});

// ---------------------------------------------------------------------------
// 8. Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // 1. AppError — domain / application
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // 2. ZodError — validation
  if (err instanceof ZodError) {
    const flat = err.flatten();
    return res.status(400).json({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Dữ liệu không hợp lệ',
      details: flat.fieldErrors,
    });
  }

  // 3. PostgreSQL errors
  if (err instanceof DatabaseError) {
    const derr = err as DatabaseError;
    if (derr.code === '23505') {
      const detail = derr.detail ?? '';
      const message = detail.includes('email')
        ? 'Email đã tồn tại'
        : detail.includes('user_code')
          ? 'Mã nhân viên đã tồn tại'
          : detail.includes('receipt_code')
            ? 'Mã phiếu thu đã tồn tại'
            : 'Dữ liệu đã tồn tại';
      return res.status(409).json({
        code: ERROR_CODES.DUPLICATE_ERROR,
        message,
      });
    }
    if (derr.code === '23503') {
      return res.status(400).json({
        code: ERROR_CODES.REFERENCE_ERROR,
        message: 'Dữ liệu tham chiếu không tồn tại',
      });
    }
    if (derr.code === 'P0001') {
      const triggerMsg = derr.message ?? '';
      const colonIdx = triggerMsg.indexOf(':');
      const code =
        colonIdx >= 0 ? triggerMsg.slice(0, colonIdx).trim() : triggerMsg.trim();
      const message =
        colonIdx >= 0
          ? triggerMsg.slice(colonIdx + 1).trim() || triggerMsg
          : triggerMsg;
      return res.status(409).json({ code, message });
    }
  }

  // 4. Unknown — không leak stack trace
  const message =
    env.NODE_ENV === 'development'
      ? err instanceof Error
        ? err.message
        : String(err)
      : 'Đã xảy ra lỗi hệ thống';

  return res.status(500).json({
    code: ERROR_CODES.INTERNAL_ERROR,
    message,
  });
});

export default app;
