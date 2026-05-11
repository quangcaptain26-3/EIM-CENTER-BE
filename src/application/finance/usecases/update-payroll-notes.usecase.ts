/**
 * Cập nhật `payroll_records.notes` sau khi đã chốt — Q29 (đính chính nhầm tháng / hội đồng).
 *
 * Cách vận hành:
 * - Chỉ ADMIN hoặc ACCOUNTANT. Không được đổi `total_salary` hay chi tiết buổi — chỉ cột `notes`.
 * - Ghi audit `FINANCE:payroll_notes_updated`.
 */
import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { PayrollNotesBodySchema } from '../dtos/finance.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class UpdatePayrollNotesUseCase {
  constructor(
    private readonly payrollRepo: IPayrollRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    payrollId: string,
    body: unknown,
    actor: { id: string; role: string; userCode?: string; ip?: string },
  ) {
    if (!['ADMIN', 'ACCOUNTANT'].includes(actor.role)) {
      throw new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'Không có quyền cập nhật ghi chú bảng lương', 403);
    }

    const { notes } = PayrollNotesBodySchema.parse(body);

    const existing = await this.payrollRepo.findById(payrollId);
    if (!existing) {
      throw new AppError(ERROR_CODES.PAYROLL_NOT_FOUND, 'Không tìm thấy bảng lương', 404);
    }

    const prevNotes = existing.notes;
    await this.payrollRepo.updateNotes(payrollId, notes);

    await this.auditLogRepo.log({
      action: 'FINANCE:payroll_notes_updated',
      actorId: actor.id,
      actorCode: actor.userCode,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'payroll_record',
      entityId: payrollId,
      entityCode: existing.payrollCode,
      oldValues: { notes: prevNotes },
      newValues: { notes },
      description: `Q29: Cập nhật ghi chú bảng lương ${existing.payrollCode}`,
    });

    return { success: true, id: payrollId, notes };
  }
}
