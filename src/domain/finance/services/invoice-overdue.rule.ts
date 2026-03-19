import type { InvoiceStatus } from '../value-objects/invoice-status.vo';

/**
 * Overdue source of truth (Backend):
 * - Một hóa đơn được xem là OVERDUE nếu:
 *   - status hiện tại là ISSUED hoặc OVERDUE (tức không phải DRAFT/PAID/CANCELED)
 *   - dueDate đã qua (so với ngày hiện tại, theo local date)
 *   - và remainingAmount > 0
 *
 * Lưu ý:
 * - Hàm này chỉ trả về "trạng thái hiệu lực" cho response/UI.
 * - Không tự cập nhật DB để tránh side effect khi chỉ đọc.
 */
export function resolveEffectiveInvoiceStatus(params: {
  status: InvoiceStatus;
  dueDate: Date;
  remainingAmount: number;
  now?: Date;
}): InvoiceStatus {
  const now = params.now ?? new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const due = new Date(params.dueDate);
  due.setHours(0, 0, 0, 0);

  // Coi overdue là "trạng thái hiệu lực" (effective state) dựa trên:
  // - remainingAmount (đã đủ tiền chưa)
  // - dueDate (đã quá hạn chưa)
  // để tránh trường hợp DB "kẹt" status = OVERDUE dù dueDate chưa tới.

  if (params.status === 'CANCELED') return 'CANCELED';

  // Nếu còn lại <= 0 thì effective luôn là PAID (trừ khi CANCELED).
  if (params.remainingAmount <= 0) return 'PAID';

  // Invoice DRAFT không được coi là overdue.
  if (params.status === 'DRAFT') return 'DRAFT';

  // Với các invoice đã phát hành (ISSUED/OVERDUE), xét theo dueDate.
  if (due < today) return 'OVERDUE';

  // Nếu trước đó DB đang để OVERDUE nhưng dueDate chưa tới, effective sẽ trở về ISSUED.
  return 'ISSUED';
}

