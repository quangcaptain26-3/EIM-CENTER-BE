import { InvoiceStatus } from "../value-objects/invoice-status.vo";

/**
 * Entity: Hóa đơn học phí (Invoice)
 */
export type Invoice = {
  id: string;             // UUID
  enrollmentId: string;   // ID của enrollment
  /** Tên học viên (join từ students.full_name) */
  studentName?: string | null;
  /** Tên chương trình (join từ curriculum_programs.name) */
  programName?: string | null;
  /**
   * Snapshot fee plan dùng để tạo hóa đơn (nếu có).
   * Giúp audit/renewal không bị drift khi fee plan bị đổi sau này.
   */
  feePlanId?: string | null;
  currency?: string | null;
  amount: number;         // Tổng số tiền cần thanh toán
  status: InvoiceStatus;  // Trạng thái hóa đơn
  dueDate: Date;          // Hạn chót thanh toán
  issuedAt?: Date;        // Thời gian phát hành hóa đơn (nếu có)
  createdAt: Date;        // Thời gian tạo
};
