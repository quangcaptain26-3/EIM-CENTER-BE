import { Request, Response, NextFunction } from 'express';
import { mapToAppError } from '../../../shared/errors/http-error.mapper';

/**
 * Express Middleware cuối cùng trong chuỗi xử lý
 * Nhận lỗi, chuyển đổi thành AppError nếu cần, và format JSON response thống nhất.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Chuyển đối các lỗi chưa biết thành AppError
  const appError = mapToAppError(err);
  
  // Ghi log lỗi vào console, có thể mở rộng ghi file hoặc gửi service log sau này
  console.error(`[Error] ${appError.code}:`, err);

  // Trả về JSON theo định dạng chuẩn đã yêu cầu
  res.status(appError.status).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
}
