/**
 * Admin duyệt / từ chối `pause_requests` — Q6 giai đoạn kiểm soát (từ buổi 4+), OVERVIEW §6.1.
 *
 * Cách vận hành:
 * - Chỉ role ADMIN. Duyệt: request → `approved`, enrollment → `paused`, tăng `pause_count`, ghi history + audit (khớp luồng “cần Admin” trong Q6).
 * - Từ chối: request → `rejected` + `review_note` + audit; enrollment không đổi trạng thái.
 */
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IPauseRequestRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { ReviewPauseRequestSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit } from '../helpers/log-enrollment-audit';

export class ReviewPauseRequestUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly pauseRequestRepo: IPauseRequestRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string }) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ có quản trị viên mới có quyền duyệt yêu cầu tạm dừng',
        403,
      );
    }

    const { requestId, status, reviewNote } = ReviewPauseRequestSchema.parse(dto);

    const request = await this.pauseRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError(ERROR_CODES.PAUSE_REQUEST_NOT_FOUND, 'Không tìm thấy yêu cầu bảo lưu', 404);
    }
    if (request.status !== 'pending') {
      throw new AppError(ERROR_CODES.PAUSE_REQUEST_ALREADY_REVIEWED, 'Yêu cầu đã được xử lý trước đó', 409);
    }

    if (status === 'rejected' && !reviewNote) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cần nhập lý do từ chối (reviewNote)', 422);
    }

    if (status === 'approved') {
      await this.pauseRequestRepo.updateStatus(requestId, 'approved', {
        reviewedBy: actor.id,
        reviewNote
      });

      const enrollment = await this.enrollmentRepo.findById(request.enrollmentId);
      if (enrollment) {
        const previousStatus = enrollment.status;
        await this.enrollmentRepo.updateStatus(request.enrollmentId, 'paused', {
          pauseCount: enrollment.pauseCount + 1,
        });

        await this.enrollmentHistoryRepo.create({
          enrollmentId: request.enrollmentId,
          action: 'paused',
          fromStatus: previousStatus,
          toStatus: 'paused',
          note: `Approved pause: ${reviewNote || 'No note'}`,
          changedBy: actor.id,
        });

        const student = await this.studentRepo.findById(enrollment.studentId);
        const entityCode = student?.studentCode ?? enrollment.id;
        await logEnrollmentStatusAudit(this.auditLogRepo, {
          action: 'ENROLLMENT:paused',
          enrollmentId: enrollment.id,
          entityCode,
          oldStatus: previousStatus,
          newStatus: 'paused',
          actor,
          description: `Duyệt bảo lưu ghi danh học viên ${entityCode}`,
        });
      }
    } else {
      await this.pauseRequestRepo.updateStatus(requestId, 'rejected', {
        reviewedBy: actor.id,
        reviewNote
      });
      await this.auditLogRepo.log({
        action: 'ENROLLMENT:pause_rejected',
        actorId: actor.id,
        actorRole: actor.role,
        entityType: 'pause_request',
        entityId: requestId,
        description: `Từ chối yêu cầu bảo lưu ${request.requestCode ?? requestId}: ${reviewNote ?? ''}`.trim(),
      });
    }

    return { success: true };
  }
}
