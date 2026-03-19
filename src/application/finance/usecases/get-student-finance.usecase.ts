import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { mapInvoice } from "../mappers/finance.mapper";
import { resolveEffectiveInvoiceStatus } from "../../../domain/finance/services/invoice-overdue.rule";

/**
 * UseCase: Lấy tóm tắt tài chính (Finance Summary) của một học viên.
 * Bước:
 *  1. Tìm tất cả enrollments của học viên đó.
 *  2. Tìm invoices theo từng enrollmentId.
 *  3. Tổng hợp paidAmount và remaining cho mỗi hóa đơn.
 */
export class GetStudentFinanceUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly paymentRepo: PaymentRepoPort,
  ) {}

  async execute(studentId: string) {
    // Lấy tất cả enrollments của học viên
    const enrollments = await this.enrollmentRepo.listByStudent(studentId);

    if (enrollments.length === 0) {
      return {
        studentId,
        enrollments: [],
        invoiceSummary: {
          total: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0,
        },
      };
    }

    // Lấy invoices cho tất cả enrollmentIds
    const invoicesByEnrollment = await Promise.all(
      enrollments.map(async (enr) => {
        const invoices = await this.invoiceRepo.list({ enrollmentId: enr.id, limit: 100 });
        const invoicesWithPaid = await Promise.all(
          invoices.map(async (inv) => {
            const paidAmount = await this.paymentRepo.sumPaid(inv.id);
            return mapInvoice(inv, { paidAmount: paidAmount });
          })
        );

        // Renewal-needed (tối thiểu, audit-friendly):
        // - Nếu enrollment ACTIVE và có ít nhất 1 invoice effective OVERDUE -> renewalNeeded = true (cần xử lý gia hạn/đóng tiền).
        // - Nếu enrollment ACTIVE và không có invoice "mở" nào (DRAFT/ISSUED/OVERDUE) còn remaining > 0 -> renewalNeeded = true
        //   (nghĩa là chưa có kỳ thanh toán tiếp theo được tạo).
        const hasOverdue = invoicesWithPaid.some((inv: any) => {
          const remaining = Number(inv.remainingAmount ?? 0);
          const eff = resolveEffectiveInvoiceStatus({
            status: inv.status,
            dueDate: new Date(inv.dueDate),
            remainingAmount: remaining,
          });
          return eff === "OVERDUE";
        });
        const hasOpenPayable = invoicesWithPaid.some((inv: any) => {
          const remaining = Number(inv.remainingAmount ?? 0);
          const eff = resolveEffectiveInvoiceStatus({
            status: inv.status,
            dueDate: new Date(inv.dueDate),
            remainingAmount: remaining,
          });
          return remaining > 0 && (eff === "DRAFT" || eff === "ISSUED" || eff === "OVERDUE");
        });
        const renewalNeeded = enr.status === "ACTIVE" && (hasOverdue || !hasOpenPayable);

        return { enrollment: enr, renewalNeeded, invoices: invoicesWithPaid };
      })
    );

    // Tính tổng hợp toàn bộ
    const allInvoices = invoicesByEnrollment.flatMap((e) => e.invoices);
    const totalAmount    = allInvoices.reduce((s, inv) => s + inv.amount, 0);
    const totalPaid      = allInvoices.reduce((s, inv) => s + (inv as any).paidAmount, 0);
    const totalRemaining = allInvoices.reduce((s, inv) => s + (inv as any).remainingAmount, 0);

    return {
      studentId,
      enrollments: invoicesByEnrollment,
      invoiceSummary: {
        total:          allInvoices.length,
        totalAmount,
        totalPaidAmount:      totalPaid,
        totalRemainingAmount: totalRemaining,
      },
    };
  }
}
