import { ErrorCodes } from './error-codes';

/**
 * Lớp lỗi tùy chỉnh của ứng dụng, chứa thông tin chi tiết về lỗi
 * Giúp chuẩn hóa các phản hồi lỗi từ API.
 */
export class AppError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    
    // Đảm bảo prototype chain cho AppError chuẩn
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // Helper cho lỗi BadRequest (400)
  static badRequest(message: string, details?: any): AppError {
    return new AppError(message, ErrorCodes.VALIDATION_ERROR, 400, details);
  }

  // Helper cho lỗi Unauthorized (401)
  static unauthorized(message: string = 'Không có quyền truy cập', details?: any): AppError {
    return new AppError(message, ErrorCodes.UNAUTHORIZED, 401, details);
  }

  // Helper cho lỗi Forbidden (403)
  static forbidden(message: string = 'Truy cập bị từ chối', details?: any): AppError {
    return new AppError(message, ErrorCodes.FORBIDDEN, 403, details);
  }

  // Helper cho lỗi NotFound (404)
  static notFound(message: string = 'Không tìm thấy tài nguyên', details?: any): AppError {
    return new AppError(message, ErrorCodes.NOT_FOUND, 404, details);
  }

  // Helper cho lỗi Conflict (409)
  static conflict(message: string, details?: any): AppError {
    return new AppError(message, ErrorCodes.CONFLICT, 409, details);
  }

  // Helper cho lỗi Internal Server Error (500)
  static internal(message: string = 'Lỗi hệ thống nội bộ', details?: any): AppError {
    return new AppError(message, ErrorCodes.INTERNAL_ERROR, 500, details);
  }
}
