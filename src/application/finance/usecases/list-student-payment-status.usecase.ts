import type { StudentPaymentStatusRepoPort } from "../../../domain/finance/repositories/student-payment-status.repo.port";
import type {
  ListStudentPaymentStatusQuery,
  StudentPaymentStatusItem,
  PaymentStatusFilter,
} from "../dtos/student-payment-status.dto";

/**
 * UseCase: Liệt kê trạng thái thanh toán học sinh theo enrollment + invoice.
 * Logic nghiệp vụ:
 * - Đã đóng: invoice effective PAID (remaining <= 0)
 * - Chưa đóng: unpaid / partial / overdue
 * - Chưa có invoice: enrollment active nhưng chưa có invoice
 * Mỗi dòng = (enrollment, invoice) hoặc (enrollment) khi chưa có invoice.
 */
export class ListStudentPaymentStatusUseCase {
  constructor(
    private readonly studentPaymentStatusRepo: StudentPaymentStatusRepoPort
  ) {}

  async execute(query: ListStudentPaymentStatusQuery) {
    const filter = {
      paymentStatus: query.paymentStatus as PaymentStatusFilter | undefined,
      classId: query.classId,
      programId: query.programId,
      keyword: query.keyword,
    };
    const [rows, total] = await Promise.all([
      this.studentPaymentStatusRepo.list({
        ...filter,
        limit: query.limit,
        offset: query.offset,
      }),
      this.studentPaymentStatusRepo.count(filter),
    ]);

    const items: StudentPaymentStatusItem[] = rows.map((r) => {
      const remaining = Math.max(0, r.invoice_amount - r.paid_amount);
      // Payment status: computed từ query đã đúng, nhưng type trả về dùng lại logic tương đương
      const paymentStatus = this.resolvePaymentStatus(
        r.invoice_id,
        r.invoice_status,
        r.invoice_amount,
        r.paid_amount,
        r.due_date
      );
      return {
        studentId: r.student_id,
        studentName: r.student_name ?? "",
        enrollmentId: r.enrollment_id,
        classId: r.class_id,
        classCode: r.class_code,
        programId: r.program_id,
        programName: r.program_name ?? null,
        invoiceId: r.invoice_id,
        invoiceAmount: r.invoice_amount,
        paidAmount: r.paid_amount,
        remainingAmount: remaining,
        dueDate: r.due_date ? r.due_date.toISOString().slice(0, 10) : null,
        paymentStatus,
      };
    });

    return {
      items,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  /** Đồng bộ logic với SQL trong repo (để mapping type-safe) */
  private resolvePaymentStatus(
    invoiceId: string | null,
    invoiceStatus: string | null,
    invoiceAmount: number,
    paidAmount: number,
    dueDate: Date | null
  ): PaymentStatusFilter {
    if (!invoiceId) return "no_invoice" as PaymentStatusFilter;
    const remaining = Math.max(0, invoiceAmount - paidAmount);
    if (remaining <= 0) return "paid" as PaymentStatusFilter;
    if (invoiceStatus === "DRAFT") return (paidAmount > 0 ? "partial" : "unpaid") as PaymentStatusFilter;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate) {
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today && remaining > 0) return "overdue" as PaymentStatusFilter;
    }
    return (paidAmount > 0 ? "partial" : "unpaid") as PaymentStatusFilter;
  }
}
