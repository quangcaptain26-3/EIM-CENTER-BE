import { ZodError } from 'zod';
import { AppError } from './app-error';

/**
 * Hàm hỗ trợ map các lỗi từ thư viện bên thứ 3 (Zod, JWT, Postgres...)
 * sang AppError để middleware lỗi có thể xử lý nhất quán.
 */
export function mapToAppError(error: any): AppError {
  // Nếu đã là AppError thì trả về luôn
  if (error instanceof AppError) {
    return error;
  }

  // Map lỗi Multer (upload file)
  // https://github.com/expressjs/multer#error-handling
  if (error?.name === 'MulterError') {
    // LIMIT_FILE_SIZE: file vượt giới hạn trong multer `limits.fileSize`
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return new AppError('File vượt 5MB', 'PAYLOAD_TOO_LARGE', 413, {
        code: 'UPLOAD/LIMIT_FILE_SIZE',
      });
    }
    return AppError.badRequest('Upload file không hợp lệ', {
      code: `UPLOAD/${String(error?.code ?? 'UNKNOWN')}`,
    });
  }

  // Map lỗi JWT (TokenExpiredError, JsonWebTokenError) thành AppError.unauthorized(...)
  if (error.name === 'TokenExpiredError') {
    return AppError.unauthorized('Token đã hết hạn, vui lòng đăng nhập lại hoặc làm mới token');
  }
  if (error.name === 'JsonWebTokenError') {
    return AppError.unauthorized('Token không hợp lệ');
  }

  // Map lỗi của Zod (ZodError) thành AppError.badRequest(..., details)
  if (error instanceof ZodError) {
    const details = error.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return AppError.badRequest('Dữ liệu không hợp lệ', details);
  }

  // Map lỗi PostgreSQL (Dựa trên pg error codes)
  // 23505: Unique Violation (Conflict)
  // 23503: Foreign Key Violation (Bad Request or Not Found)
  if (error.code === '23505') {
    return AppError.conflict('Dữ liệu đã tồn tại trong hệ thống');
  }
  if (error.code === '23503') {
    return AppError.badRequest('Yêu cầu dữ liệu liên quan không tồn tại hoặc đã bị ràng buộc');
  }
  // P0001: lỗi nghiệp vụ được throw từ trigger/function trong DB
  if (error.code === 'P0001') {
    if (error.message === 'CLASS_CAPACITY_EXCEEDED') {
      return AppError.badRequest('Khóa học đã đạt giới hạn học viên (capacity)', {
        code: 'CLASS/CAPACITY_EXCEEDED',
      });
    }
    if (error.message === 'CLASS_NOT_FOUND') {
      return AppError.badRequest('Lớp học không tồn tại', { code: 'CLASS/NOT_FOUND' });
    }
    return AppError.badRequest('Yêu cầu không hợp lệ', {
      code: 'DB/BUSINESS_RULE_VIOLATION',
      message: error.message,
    });
  }

  // Mặc định trả về lỗi hệ thống 500 cho các trường hợp không map được
  return AppError.internal(
    'Có lỗi xảy ra trong quá trình xử lý',
    process.env.NODE_ENV === 'development' ? error.stack || error.message : undefined
  );
}
