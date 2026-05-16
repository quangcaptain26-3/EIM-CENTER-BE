/**
 * Admin duyệt / từ chối yêu cầu hoàn phí — bước sau `CreateRefundRequestUseCase` (Q19, Q13).
 *
 * Cách vận hành:
 * - Chỉ ADMIN; từ chối bắt buộc `review_note`.
 * - Duyệt: tạo phiếu thu **âm** gắn enrollment; enrollment → dropped nếu cần; **cuối cùng** mới đổi status request (tránh DB approved mà UI/API lỗi giữa chừng).
 * - Từ chối: chỉ audit + đổi status.
 */
import { IRefundRequestRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { ReviewRefundRequestSchema } from '../dtos/refund.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { amountToWordsVi } from '../../../shared/utils/amount-to-words';

export class ReviewRefundRequestUseCase {
  constructor(
    private readonly refundRequestRepo: IRefundRequestRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly receiptRepo: IReceiptRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    dto: unknown,
    actor: { id: string; role: string; userCode?: string; ip?: string },
  ) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ có ADMIN mới có quyền duyệt yêu cầu hoàn phí',
        403,
      );
    }

    const { requestId, status, reviewNote } = ReviewRefundRequestSchema.parse(dto);
    if (status === 'rejected' && !reviewNote?.trim()) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Từ chối yêu cầu hoàn học phí bắt buộc nhập reviewNote',
        422,
      );
    }

    const request = await this.refundRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError(ERROR_CODES.REFUND_REQUEST_NOT_FOUND, 'Không tìm thấy yêu cầu hoàn phí', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Yêu cầu đã được xử lý. Vui lòng tải lại danh sách.',
        409,
      );
    }

    let receiptId: string | undefined;

    if (status === 'approved') {
      const refundAmount = Number(request.refundAmount ?? 0);
      if (refundAmount <= 0) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Số tiền hoàn phí không hợp lệ', 422);
      }

      const enrollment = await this.enrollmentRepo.findById(request.enrollmentId);
      if (!enrollment) {
        throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh để hoàn phí', 404);
      }
      const student = await this.studentRepo.findById(enrollment.studentId);
      if (!student) {
        throw new AppError(ERROR_CODES.STUDENT_NOT_FOUND, 'Không tìm thấy học viên để hoàn phí', 404);
      }

      const refundReceipt = await this.receiptRepo.create({
        receiptCode: generateEimCode('PT'),
        payerName: student.fullName,
        payerAddress: '',
        studentId: student.id,
        enrollmentId: enrollment.id,
        reason: `Hoàn phí theo yêu cầu ${request.requestCode}`,
        amount: -refundAmount,
        amountInWords: amountToWordsVi(-refundAmount),
        paymentMethod: 'bank_transfer',
        paymentDate: new Date(),
        note: reviewNote?.trim() || `Auto refund receipt for ${request.requestCode}`,
        createdBy: actor.id,
        payerSignatureName: student.parentName || student.fullName,
      });
      receiptId = refundReceipt.id;

      if (enrollment.status !== 'dropped') {
        const fromStatus = enrollment.status;
        await this.enrollmentRepo.updateStatus(enrollment.id, 'dropped');

        await this.enrollmentHistoryRepo.create({
          enrollmentId: enrollment.id,
          action: 'dropped',
          fromStatus,
          toStatus: 'dropped',
          note: `Approved refund drop: ${reviewNote}`,
          changedBy: actor.id,
        });
      }

      await this.auditLogRepo.log({
        action: 'FINANCE:refund_approved',
        actorId: actor.id,
        actorCode: actor.userCode,
        actorRole: actor.role,
        actorIp: actor.ip,
        entityType: 'refund_request',
        entityId: requestId,
        entityCode: request.requestCode,
        oldValues: { status: 'pending' },
        newValues: { status: 'approved' },
        description: `Duyệt yêu cầu hoàn phí ${request.requestCode}. Đã tạo phiếu hoàn ${refundReceipt.receiptCode}.`,
      });
    } else {
      await this.auditLogRepo.log({
        action: 'FINANCE:refund_rejected',
        actorId: actor.id,
        actorCode: actor.userCode,
        actorRole: actor.role,
        actorIp: actor.ip,
        entityType: 'refund_request',
        entityId: requestId,
        entityCode: request.requestCode,
        oldValues: { status: 'pending' },
        newValues: { status: 'rejected' },
        description: `Từ chối yêu cầu hoàn phí ${request.requestCode}`,
      });
    }

    await this.refundRequestRepo.updateStatus(requestId, status, {
      reviewedBy: actor.id,
      reviewNote,
      receiptId,
    });

    return { success: true };
  }
}
