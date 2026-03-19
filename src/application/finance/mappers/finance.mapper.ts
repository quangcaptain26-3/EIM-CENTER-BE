import { FeePlan } from "../../../domain/finance/entities/fee-plan.entity";
import { Invoice } from "../../../domain/finance/entities/invoice.entity";
import { Payment } from "../../../domain/finance/entities/payment.entity";
import { resolveEffectiveInvoiceStatus } from "../../../domain/finance/services/invoice-overdue.rule";

/**
 * Mapper: Chuẩn hoá FeePlan trả về cho controller/swagger.
 */
export function mapFeePlan(fp: FeePlan) {
  return {
    id:              fp.id,
    programId:       fp.programId,
    name:            fp.name,
    amount:          fp.amount,
    currency:        fp.currency,
    sessionsPerWeek: fp.sessionsPerWeek,
    createdAt:       fp.createdAt.toISOString(),
  };
}

/**
 * Mapper: Chuẩn hoá Invoice kèm trường tính toán thêm.
 */
export function mapInvoice(
  inv: Invoice,
  options?: { paidAmount?: number; lastPaidAt?: Date | null; payments?: Payment[] }
) {
  const paidAmount  = options?.paidAmount  ?? 0;
  const remainingAmount  = Math.max(0, inv.amount - paidAmount);
  const isPaidFull = remainingAmount === 0 && inv.amount > 0;
  const effectiveStatus = resolveEffectiveInvoiceStatus({
    status: inv.status,
    dueDate: inv.dueDate,
    remainingAmount,
  });

  return {
    id:           inv.id,
    enrollmentId: inv.enrollmentId,
    studentName:  inv.studentName ?? null,
    programName:  inv.programName ?? null,
    feePlanId:    inv.feePlanId ?? null,
    currency:     inv.currency ?? "VND",
    amount:       inv.amount,
    // Backend là nguồn chân lý cho overdue: trả về status hiệu lực cho UI.
    status:       effectiveStatus,
    dueDate:      inv.dueDate instanceof Date
      ? inv.dueDate.toISOString().slice(0, 10)
      : String(inv.dueDate),
    issuedAt:     inv.issuedAt ? inv.issuedAt.toISOString() : null,
    createdAt:    inv.createdAt.toISOString(),
    // Ngày đóng (ngày thanh toán gần nhất)
    lastPaidAt:   options?.lastPaidAt ? options.lastPaidAt.toISOString() : null,
    // Trường tính toán
    paidAmount,
    remainingAmount,
    isPaidFull,
    payments:     options?.payments?.map(mapPayment) ?? undefined,
  };
}

/**
 * Mapper: Chuẩn hoá Payment.
 */
export function mapPayment(p: Payment) {
  return {
    id:        p.id,
    invoiceId: p.invoiceId,
    amount:    p.amount,
    method:    p.method,
    paidAt:    p.paidAt instanceof Date ? p.paidAt.toISOString() : String(p.paidAt),
    createdAt: p.createdAt.toISOString(),
  };
}
