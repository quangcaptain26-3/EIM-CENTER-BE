/**
 * Tạo yêu cầu hoàn phí (mã HP) — Q13 (lý do khách quan/đặc biệt), Q19 (60 ngày không khai giảng), OVERVIEW §6.3.
 *
 * Cách vận hành:
 * - Chỉ ADMIN. Với `center_unable_within_60days`: `refund_amount` = tổng các phiếu thu **dương** đã thu (gồm phí giữ chỗ), không lấy thuần `tuition_fee` vì reserved có thể chỉ có receipt 500k (Q19).
 * - `subjective_*`: hoàn 0 + trạng thái completed ngay (ghi nhận quyết định không hoàn tiền — thống nhất Q13).
 * - `special_case`: bắt buộc số tiền + ghi chú duyệt; các nhánh khác theo `CreateRefundRequestSchema`.
 */
import { IRefundRequestRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { CreateRefundRequestSchema } from '../dtos/refund.dto';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CreateRefundRequestUseCase {
  constructor(
    private readonly refundRequestRepo: IRefundRequestRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly receiptRepo: IReceiptRepo,
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string; ip?: string }) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN mới có quyền tạo yêu cầu hoàn học phí',
        403,
      );
    }

    const input = CreateRefundRequestSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(input.enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    let finalAmount = 0;
    let finalStatus: 'pending' | 'completed' = 'pending';

    if (input.reasonType === 'center_unable_within_60days') {
      // Q19: hoàn toàn bộ tiền đã thu (phiếu dương), gồm phí giữ chỗ — không lấy thuần tuition_fee vì reserved có thể chỉ có receipt 500k.
      const receipts = await this.receiptRepo.findByEnrollment(enrollment.id);
      const paidPositive = receipts.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
      if (paidPositive <= 0) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Không có phiếu thu dương nào — không thể tạo yêu cầu hoàn trung tâm không khai giảng (Q19)',
          422,
        );
      }
      finalAmount = paidPositive;
      finalStatus = 'pending';
    } else if (input.reasonType.startsWith('subjective_')) {
      finalAmount = 0;
      finalStatus = 'completed';
    } else if (input.reasonType === 'special_case') {
      if (input.refundAmount === undefined || input.refundAmount < 0 || !input.reviewNote?.trim()) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'special_case bắt buộc nhập refundAmount và reviewNote',
          422,
        );
      }
      finalAmount = input.refundAmount;
      finalStatus = 'pending';
    } else {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'reasonType không hợp lệ', 422);
    }

    const requestCode = generateEimCode('HP');

    const request = await this.refundRequestRepo.create({
      requestCode,
      enrollmentId: enrollment.id,
      reasonType: input.reasonType,
      // Rule dễ đổi: muốn bắt review_note cho reason khác, sửa validate ở nhánh reason phía trên.
      reasonDetail: input.reasonDetail,
      refundAmount: finalAmount,
      status: finalStatus,
    });

    if (finalStatus === 'completed') {
      const fromStatus = enrollment.status;
      await this.enrollmentRepo.updateStatus(enrollment.id, 'dropped');

      await this.enrollmentHistoryRepo.create({
        enrollmentId: enrollment.id,
        action: 'dropped',
        fromStatus,
        toStatus: 'dropped',
        note: `Subjective drop without refund: ${input.reasonDetail}`,
        changedBy: actor.id,
      });
    }

    await this.auditLogRepo.log({
      action: 'FINANCE:refund_request_created',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'enrollment',
      entityId: enrollment.id,
      description: `Tạo yêu cầu hoàn phí ${requestCode} (${input.reasonType}) cho enrollment ${enrollment.id}`,
      newValues: {
        refundAmount: finalAmount,
        reasonType: input.reasonType,
        reviewNote: input.reviewNote ?? null,
      },
    });

    return request;
  }
}
