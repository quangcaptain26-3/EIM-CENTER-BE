import type { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';

/** Tổng tiền đã thu (phiếu dương) — dùng cho hoàn 100% lỗi trung tâm (Q19, TH1). */
export async function computePaidPositiveTotal(
  receiptRepo: IReceiptRepo,
  enrollmentId: string,
): Promise<number> {
  const receipts = await receiptRepo.findByEnrollment(enrollmentId);
  return receipts.filter((r) => r.amount > 0).reduce((sum, r) => sum + r.amount, 0);
}
