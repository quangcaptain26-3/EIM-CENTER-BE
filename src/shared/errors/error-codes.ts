/**
 * Danh sách các mã lỗi chuẩn của toàn hệ thống
 * Mã lỗi này sẽ được trả về dạng chuỗi trong JSON response.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CLASS_FULL: 'CLASS_FULL',
} as const;
