import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export interface DebtSummary {
  enrollmentId: string;
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

    return {
      enrollmentId,
      tuitionFee:    enrollment.tuitionFee,
      totalPaid,
      totalRefunded,
      debt,
      receipts,
    };
  }
}
