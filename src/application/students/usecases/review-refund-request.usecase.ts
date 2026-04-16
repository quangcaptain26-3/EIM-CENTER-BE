import { IRefundRequestRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { ReviewRefundRequestSchema } from '../dtos/refund.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ReviewRefundRequestUseCase {
  constructor(
    private readonly refundRequestRepo: IRefundRequestRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly auditLogRepo: IAuditLogRepo
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

    const request = await this.refundRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError(ERROR_CODES.REFUND_REQUEST_NOT_FOUND, 'Không tìm thấy yêu cầu hoàn phí', 404);
    }

    if (request.status !== 'pending') {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Yêu cầu đã được xử lý', 409);
    }

    await this.refundRequestRepo.updateStatus(requestId, status, {
      reviewedBy: actor.id,
      reviewNote
    });

    if (status === 'approved') {
      const enrollment = await this.enrollmentRepo.findById(request.enrollmentId);
      if (enrollment && enrollment.status !== 'dropped') {
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
        description: `Duyệt yêu cầu hoàn phí ${request.requestCode}`,
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

    return { success: true };
  }
}
