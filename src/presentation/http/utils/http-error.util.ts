import { Response } from 'express';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

/**
 * Trả JSON chuẩn `{ code, message }` (và `details` nếu có) từ AppError hoặc lỗi không xác định.
 */
export function sendErrorResponse(res: Response, error: unknown, fallbackStatus = 400): void {
  if (error instanceof AppError) {
    res.status(error.httpStatus).json({
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  res.status(fallbackStatus).json({
    code: ERROR_CODES.VALIDATION_ERROR,
    message,
  });
}
