import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { DropEnrollmentSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';

export class DropEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: unknown, actor: EnrollmentAuditActor) {
    const { enrollmentId, reasonType, reasonDetail } = DropEnrollmentSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    const canTransition = this.transitionRule.canTransition(enrollment.status, 'dropped', enrollment);
    if (!canTransition) {
      const blockReason = this.transitionRule.getBlockReason(enrollment.status, 'dropped', enrollment);
      throw new AppError(ERROR_CODES.TRANSITION_BLOCKED, blockReason ?? 'Không thể hủy ghi danh', 422);
    }

    const isSubjective = reasonType.startsWith('subjective_');
    if (enrollment.sessionsAttended >= 3 && !isSubjective) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Đã học từ 3 buổi trở lên, chỉ được phép chọn lý do hủy chủ quan từ học viên (subjective_*)',
        422,
      );
    }

    if (enrollment.sessionsAttended < 3) {
      if (!isSubjective && reasonType !== 'center_unable_to_open') {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Lý do không hợp lệ. Chỉ chấp nhận center_unable_to_open hoặc subjective_*',
          422,
        );
      }
    }

    const previousStatus = enrollment.status;

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'dropped');

    const note = `${reasonType}: ${reasonDetail}`;

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
      description: `Hủy ghi danh — học viên ${entityCode}`,
    });

    return updated;
  }
}
