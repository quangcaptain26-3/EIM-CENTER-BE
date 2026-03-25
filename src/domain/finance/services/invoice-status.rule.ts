import { InvoiceStatus } from "../value-objects/invoice-status.vo";

/**
 * Rule kinh doanh: Kiểm tra việc chuyển đổi trạng thái của Hóa đơn có hợp lệ hay không.
 * Các luồng trạng thái được phép:
 *  - DRAFT   -> ISSUED hoặc CANCELED
 *  - ISSUED  -> PAID hoặc OVERDUE hoặc CANCELED (ISSUED = unpaid/partial, PAID khi đủ tiền)
 *  - OVERDUE -> PAID hoặc CANCELED
 *  - PAID    -> (bị chặn — không thể chuyển sang bất kỳ status nào)
 *  - CANCELED-> (bị chặn — không thể chuyển sang bất kỳ status nào)
 *
 * @param from Trạng thái lúc đầu
 * @param to Trạng thái muốn chuyển đến
 * @returns boolean
 */
export function canChangeInvoiceStatus(
  from: InvoiceStatus,
  to: InvoiceStatus
): boolean {
  if (from === to) return true;

  switch (from) {
    case "DRAFT":
      return to === "ISSUED" || to === "CANCELED";
    case "ISSUED":
      return to === "PAID" || to === "OVERDUE" || to === "CANCELED";
    case "OVERDUE":
      return to === "PAID" || to === "CANCELED";
    case "PAID":
      return false;
    case "CANCELED":
      return false;
    default:
      return false;
  }
}
