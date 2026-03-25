import type { PaymentStatusFilter } from "../../../application/finance/dtos/student-payment-status.dto";

/** Dòng thô từ query (chưa có paymentStatus computed) */
export type StudentPaymentStatusRow = {
  student_id: string;
  student_name: string;
  enrollment_id: string;
  class_id: string | null;
  class_code: string | null;
  program_id: string | null;
  program_name: string | null;
  invoice_id: string | null;
  invoice_amount: number;
  paid_amount: number;
  invoice_status: string | null;
  due_date: Date | null;
};

/**
 * Port: Truy vấn danh sách trạng thái thanh toán học sinh theo enrollment + invoice.
 * Không gộp theo student đơn lẻ; mỗi dòng = (enrollment, invoice) hoặc (enrollment) khi chưa có invoice.
 */
export interface StudentPaymentStatusRepoPort {
  list(params: {
    paymentStatus?: PaymentStatusFilter;
    classId?: string;
    programId?: string;
    keyword?: string;
    limit: number;
    offset: number;
  }): Promise<StudentPaymentStatusRow[]>;

  count(params: {
    paymentStatus?: PaymentStatusFilter;
    classId?: string;
    programId?: string;
    keyword?: string;
  }): Promise<number>;
}
