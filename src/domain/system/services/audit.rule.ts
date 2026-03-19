/**
 * Domain Service Helper: Audit Log Rules
 * Cung cấp các tiện ích xử lý metadata trước khi ghi log.
 */

/**
 * Danh sách các field nhạy cảm cần loại bỏ khỏi meta trước khi lưu.
 * Ví dụ: password, token, secret key…
 */
const SENSITIVE_FIELDS = [
  "password",
  "password_hash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "creditCard",
];

/**
 * Xây dựng đối tượng meta an toàn để ghi vào audit log.
 * Loại bỏ các field nhạy cảm ra khỏi object trước khi lưu.
 *
 * @param meta - Object metadata gốc từ usecase/controller
 * @returns Object đã được làm sạch, sẵn sàng lưu vào cột meta jsonb
 */
export function buildMetaSafe(meta: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    // Bỏ qua nếu key nằm trong danh sách nhạy cảm
    if (SENSITIVE_FIELDS.includes(key)) continue;

    // Bỏ qua giá trị undefined
    if (value === undefined) continue;

    result[key] = value;
  }

  return result;
}
