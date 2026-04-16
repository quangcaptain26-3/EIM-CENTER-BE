import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { CreateReceiptUseCase } from './create-receipt.usecase';

export class VoidReceiptUseCase {
  constructor(
    private readonly receiptRepo: IReceiptRepo,
    private readonly createReceiptUseCase: CreateReceiptUseCase,
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

    return this.createReceiptUseCase.execute(
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
  }
}
