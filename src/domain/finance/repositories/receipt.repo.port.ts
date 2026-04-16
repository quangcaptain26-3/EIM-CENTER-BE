import { ReceiptEntity } from '../entities/receipt.entity';
import { PayrollEntity, PayrollSessionDetail } from '../entities/payroll.entity';

// ─── Receipt ────────────────────────────────────────────────────────────────

export interface ReceiptFilter {
  studentId?: string;
  enrollmentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export interface IReceiptRepo {
  findById(id: string): Promise<ReceiptEntity | null>;
  findByEnrollment(enrollmentId: string): Promise<ReceiptEntity[]>;
  findAll(filter: ReceiptFilter): Promise<{ data: ReceiptEntity[]; total: number }>;
  create(data: Partial<ReceiptEntity>): Promise<ReceiptEntity>;
  // KHÔNG có update, KHÔNG có delete — receipts là immutable
}

// ─── Payroll ─────────────────────────────────────────────────────────────────

export interface PayrollFilter {
  teacherId?: string;
  month?: number;
  year?: number;
  page: number;
  limit: number;
}

export interface IPayrollRepo {
  findById(id: string): Promise<PayrollEntity | null>;
  findByTeacherAndPeriod(
    teacherId: string,
    month: number,
    year: number,
  ): Promise<PayrollEntity | null>;
  findAll(filter: PayrollFilter): Promise<{ data: PayrollEntity[]; total: number }>;
  /**
   * Tạo payroll cùng với session details trong 1 transaction:
   * BEGIN → INSERT payroll_records → INSERT payroll_session_details → COMMIT
   */
  createWithDetails(
    payroll: Partial<PayrollEntity>,
    details: Partial<PayrollSessionDetail>[],
  ): Promise<PayrollEntity>;
}
