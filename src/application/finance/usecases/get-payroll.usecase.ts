import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { PayrollEntity, PayrollSessionDetail } from '../../../domain/finance/entities/payroll.entity';

export interface PayrollWithDetails {
  payroll: PayrollEntity;
  details: PayrollSessionDetail[];
}

export class GetPayrollUseCase {
  constructor(
    private readonly payrollRepo: IPayrollRepo,
    private readonly db: any,
  ) {}

  async execute(payrollId: string): Promise<PayrollWithDetails> {
    const payroll = await this.payrollRepo.findById(payrollId);
    if (!payroll) {
      throw new AppError(
        ERROR_CODES.PAYROLL_NOT_FOUND,
        `Không tìm thấy bảng lương (id: ${payrollId})`,
        404,
      );
    }

    // Fetch session details (stored in payroll_session_details table)
    const detailsRes = await this.db.query(
      `SELECT id, payroll_id, session_id, session_date, class_code, was_cover
       FROM payroll_session_details
       WHERE payroll_id = $1
       ORDER BY session_date ASC`,
      [payrollId],
    );

    const details: PayrollSessionDetail[] = detailsRes.rows.map(
      (r: any) =>
        new PayrollSessionDetail(
          r.id,
          r.payroll_id,
          r.session_id,
          r.session_date,
          r.class_code,
          Boolean(r.was_cover),
        ),
    );

    return { payroll, details };
  }
}
