/**
 * Công nợ / đã thu theo một enrollment — Q5, OVERVIEW §5.3 (debt = học phí − đã thu, có thể âm = dư — Q24).
 *
 * Cách vận hành:
 * - `totalPaid` = sum phiếu dương; `totalRefunded` = tổng trị tuyệt đối phiếu âm; `debt = tuition_fee - totalPaid + totalRefunded` (số âm = dư tiền — Q24).
 */
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IEnrollmentRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export interface DebtSummary {
  enrollmentId: string;
  studentId: string;
  studentName: string | null;
  classCode: string | null;
  enrollmentStatus: string;
  tuitionFee: number;
  totalPaid: number;
  totalRefunded: number;
  /** debt = tuitionFee - totalPaid + totalRefunded */
  debt: number;
  receipts: Awaited<ReturnType<IReceiptRepo['findByEnrollment']>>;
}

export class GetDebtUseCase {
  constructor(
    private readonly receiptRepo: IReceiptRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly classRepo: IClassRepo,
  ) {}

  async execute(enrollmentId: string): Promise<DebtSummary> {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(
        ERROR_CODES.ENROLLMENT_NOT_FOUND,
        'Không tìm thấy enrollment',
        404,
      );
    }

    const receipts = await this.receiptRepo.findByEnrollment(enrollmentId);

    const totalPaid = receipts
      .filter((r) => r.amount > 0)
      .reduce((sum, r) => sum + r.amount, 0);

    const totalRefunded = receipts
      .filter((r) => r.amount < 0)
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);

    const debt = enrollment.tuitionFee - totalPaid + totalRefunded;

    const [student, cls] = await Promise.all([
      this.studentRepo.findById(enrollment.studentId),
      this.classRepo.findById(enrollment.classId),
    ]);

    return {
      enrollmentId,
      studentId: enrollment.studentId,
      studentName: student?.fullName ?? null,
      classCode: cls?.classCode ?? null,
      enrollmentStatus: enrollment.status,
      tuitionFee: enrollment.tuitionFee,
      totalPaid,
      totalRefunded,
      debt,
      receipts,
    };
  }
}
