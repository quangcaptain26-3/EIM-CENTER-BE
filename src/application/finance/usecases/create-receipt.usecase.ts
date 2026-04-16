import { CreateReceiptDto, CreateReceiptSchema } from '../dtos/finance.dto';
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { amountToWordsVi } from '../../../shared/utils/amount-to-words';

export class CreateReceiptUseCase {
  constructor(
    private readonly receiptRepo: IReceiptRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    /**
     * Injected forward reference — ActivateEnrollmentUseCase sẽ được wire vào
     * sau ở bootstrap để tránh circular dependency.
     */
    private readonly activateEnrollmentFn: (
      enrollmentId: string,
      actor: { id: string },
    ) => Promise<unknown>,
  ) {}

  async execute(
    dto: CreateReceiptDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    if (!['ACCOUNTANT', 'ADMIN'].includes(actor.role)) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ACCOUNTANT hoặc ADMIN mới có thể tạo phiếu thu',
        403,
      );
    }

    // 1. Validate DTO
    const data = CreateReceiptSchema.parse(dto);

    // 2. Check enrollment tồn tại
    const enrollment = await this.enrollmentRepo.findById(data.enrollmentId);
    if (!enrollment) {
      throw new AppError(
        ERROR_CODES.RECEIPT_ENROLLMENT_REQUIRED,
        'Không tìm thấy enrollment để tạo phiếu thu',
        404,
      );
    }

    // 3. Nếu amount < 0 → validate voidedByReceiptId tồn tại và đúng enrollment
    if (data.amount < 0) {
      const voidTarget = await this.receiptRepo.findById(data.voidedByReceiptId!);
      if (!voidTarget) {
        throw new AppError(
          ERROR_CODES.RECEIPT_NOT_FOUND,
          `Không tìm thấy phiếu thu cần bù trừ (id: ${data.voidedByReceiptId})`,
          404,
        );
      }
      if (voidTarget.enrollmentId !== data.enrollmentId) {
        throw new AppError(
          ERROR_CODES.RECEIPT_ENROLLMENT_REQUIRED,
          'Phiếu thu bù trừ phải thuộc cùng enrollment',
          422,
        );
      }
    }

    // 4. Sinh mã phiếu thu
    const receiptCode = generateEimCode('PT');

    // 5. Chuyển số thành chữ (tiếng Việt)
    const amountInWords = amountToWordsVi(data.amount);

    // 6. INSERT receipt
    const receipt = await this.receiptRepo.create({
      receiptCode,
      payerName:          data.payerName,
      payerAddress:       data.payerAddress ?? '',
      studentId:          data.studentId,
      enrollmentId:       data.enrollmentId,
      reason:             data.reason,
      amount:             data.amount,
      amountInWords,
      paymentMethod:      data.paymentMethod as any,
      paymentDate:        new Date(data.paymentDate),
      note:               data.note,
      createdBy:          actor.id,
      payerSignatureName: data.payerSignatureName ?? data.payerName,
      voidedByReceiptId:  data.voidedByReceiptId,
    });

    // 7. Auto-activate nếu đủ học phí
    if (data.amount > 0 && ['pending', 'trial'].includes(enrollment.status)) {
      const allReceipts = await this.receiptRepo.findByEnrollment(data.enrollmentId);
      const totalPaid = allReceipts.reduce((sum, r) => sum + r.amount, 0);
      if (totalPaid >= enrollment.tuitionFee) {
        // Delegate — use try/catch vì không muốn lỗi activate block việc tạo receipt
        try {
          await this.activateEnrollmentFn(data.enrollmentId, { id: actor.id });
        } catch {
          // Log nhưng không throw — receipt đã tạo thành công
        }
      }
    }

    // 8. Audit log
    await this.auditLogRepo.log({
      action:     'FINANCE:receipt_created',
      actorId:    actor.id,
      actorRole:  actor.role,
      actorIp:    actor.ip,
      entityType: 'receipt',
      entityId:   receipt.id,
      entityCode: receipt.receiptCode,
      description: `Tạo phiếu thu ${receipt.receiptCode} — ${data.amount.toLocaleString('vi-VN')}đ`,
    });

    return receipt;
  }
}
