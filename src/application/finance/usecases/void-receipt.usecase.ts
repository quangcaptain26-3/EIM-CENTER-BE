/**
 * “Hủy” phiếu thu bằng phiếu đối ứng — Q2, Q24, OVERVIEW §2.2 (không DELETE, chỉ bù trừ).
 *
 * Cách vận hành:
 * - Tạo phiếu mới `amount = -original.amount`, `voided_by_receipt_id = original.id`, ủy quyền `CreateReceiptUseCase` để thống nhất validate + audit.
 */
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { CreateReceiptUseCase } from './create-receipt.usecase';

export class VoidReceiptUseCase {
  constructor(
    private readonly receiptRepo: IReceiptRepo,
    private readonly createReceiptUseCase: CreateReceiptUseCase,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  /**
   * Tạo phiếu âm bù trừ:
   *   amount = -original.amount
   *   voidedByReceiptId = original.id
   * Delegate hoàn toàn sang CreateReceiptUseCase để tái dụng logic
   * (validate, sinh mã, audit log…).
   */
  async execute(
    originalReceiptId: string,
    actor: { id: string; role: string; ip?: string },
    overrides?: { reason?: string; note?: string },
  ) {
    const original = await this.receiptRepo.findById(originalReceiptId);
    if (!original) {
      throw new AppError(
        ERROR_CODES.RECEIPT_NOT_FOUND,
        `Không tìm thấy phiếu thu cần hủy (id: ${originalReceiptId})`,
        404,
      );
    }

    const voidReceipt = await this.createReceiptUseCase.execute(
      {
        payerName:          original.payerName,
        payerAddress:       original.payerAddress,
        studentId:          original.studentId,
        enrollmentId:       original.enrollmentId,
        reason:             overrides?.reason ?? `Bù trừ phiếu ${original.receiptCode}`,
        amount:             -original.amount,
        // API/DB dùng 'cash' | 'transfer' (khác tên domain nếu có legacy)
        paymentMethod:      original.paymentMethod === 'cash' ? 'cash' : 'transfer',
        paymentDate:        new Date().toISOString(),
        note:               overrides?.note,
        payerSignatureName: original.payerSignatureName,
        voidedByReceiptId:  original.id,
      },
      actor,
    );

    const note = overrides?.note?.trim();
    const reason = overrides?.reason?.trim() || `Bù trừ phiếu ${original.receiptCode}`;
    await this.auditLogRepo.log({
      action: 'FINANCE:receipt_voided',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'receipt',
      entityId: original.id,
      entityCode: original.receiptCode,
      description: `Void phiếu thu ${original.receiptCode}. Lý do: ${reason}${note ? ` | Ghi chú: ${note}` : ''}`,
      oldValues: {
        receiptId: original.id,
        amount: original.amount,
      },
      newValues: {
        voidReceiptId:
          (voidReceipt as { receipt?: { id?: string } })?.receipt?.id ??
          (voidReceipt as { id?: string })?.id,
      },
    });

    return voidReceipt;
  }
}
