import type { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import type { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import type { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import { resolveEffectiveInvoiceStatus } from "../../../domain/finance/services/invoice-overdue.rule";

/**
 * R4: Service kiểm tra điều kiện eligibility cho enrollment (liên quan tài chính).
 * Dùng để chặn tạo enrollment mới khi học viên còn nợ quá hạn.
 */
export class EnrollmentEligibilityService {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly paymentRepo: PaymentRepoPort,
  ) {}

  /**
   * Kiểm tra học viên có enrollment ACTIVE/PAUSED nào đang có invoice effective OVERDUE không.
   * @param studentId ID học viên
   * @param excludeEnrollmentId (optional) Loại trừ enrollment này khỏi kiểm tra (dùng khi transfer: enrollment cũ sẽ kết thúc)
   */
  async studentHasOverdue(
    studentId: string,
    excludeEnrollmentId?: string,
  ): Promise<boolean> {
    const enrollments = await this.enrollmentRepo.listByStudent(studentId);
    const activeOrPaused = enrollments.filter(
      (e) => e.status === "ACTIVE" || e.status === "PAUSED",
    );

    for (const enr of activeOrPaused) {
      if (excludeEnrollmentId && enr.id === excludeEnrollmentId) continue;

      const invoices = await this.invoiceRepo.list({
        enrollmentId: enr.id,
        limit: 100,
      });

      for (const inv of invoices) {
        if (inv.status === "CANCELED" || inv.status === "PAID") continue;

        const paidAmount = await this.paymentRepo.sumPaid(inv.id);
        const remaining = Number(inv.amount) - Number(paidAmount);
        if (remaining <= 0) continue;

        const effective = resolveEffectiveInvoiceStatus({
          status: inv.status,
          dueDate: inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate),
          remainingAmount: remaining,
        });

        if (effective === "OVERDUE") return true;
      }
    }

    return false;
  }
}
