/**
 * Hủy giữ chỗ (Q39) — reserved | pending → dropped; phí giữ chỗ không hoàn (trừ Q19).
 */
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { CancelReservationSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';

export class CancelReservationUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: unknown, actor: EnrollmentAuditActor) {
    const { enrollmentId, reasonDetail } = CancelReservationSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (!['reserved', 'pending'].includes(enrollment.status)) {
      throw new AppError(
        ERROR_CODES.ENROLLMENT_INVALID_STATUS,
        'Chỉ có thể hủy giữ chỗ khi ghi danh đang reserved hoặc pending',
        422,
      );
    }

    if (enrollment.sessionsAttended > 0) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Không thể hủy giữ chỗ sau khi đã có buổi học',
        422,
      );
    }

    const canTransition = this.transitionRule.canTransition(enrollment.status, 'dropped', enrollment);
    if (!canTransition) {
      const blockReason = this.transitionRule.getBlockReason(enrollment.status, 'dropped', enrollment);
      throw new AppError(ERROR_CODES.TRANSITION_BLOCKED, blockReason ?? 'Không thể hủy giữ chỗ', 422);
    }

    const previousStatus = enrollment.status;
    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'dropped');

    const note = `reservation_forfeited: ${reasonDetail} — Hủy giữ chỗ; phí giữ chỗ không hoàn (trừ lỗi trung tâm / Q19).`;

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'dropped',
      fromStatus: previousStatus,
      toStatus: 'dropped',
      note,
      changedBy: actor.id,
    });

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;
    await logEnrollmentStatusAudit(this.auditLogRepo, {
      action: 'ENROLLMENT:dropped',
      enrollmentId,
      entityCode,
      oldStatus: previousStatus,
      newStatus: 'dropped',
      actor,
      description: `Hủy giữ chỗ — học viên ${entityCode}`,
    });

    return updated;
  }
}
