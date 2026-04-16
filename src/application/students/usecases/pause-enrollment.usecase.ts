import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IPauseRequestRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { PauseEnrollmentSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';
import { enrollmentEntityToResponse } from '../mappers/enrollment.mapper';

export class PauseEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly pauseRequestRepo: IPauseRequestRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: unknown, actor: EnrollmentAuditActor) {
    const { enrollmentId, reason } = PauseEnrollmentSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (enrollment.status !== 'active' && enrollment.status !== 'trial') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Chỉ có thể tạm dừng khi đang học (active hoặc trial)',
        422,
      );
    }

    if (enrollment.sessionsAttended < 3) {
      const previousStatus = enrollment.status;
      const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'paused', {
        ...(enrollment.paidAt != null ? { paidAt: enrollment.paidAt } : {}),
      });

      await this.enrollmentHistoryRepo.create({
        enrollmentId,
        action: 'paused',
        fromStatus: previousStatus,
        toStatus: 'paused',
        note: `Direct pause: ${reason}`,
        changedBy: actor.id,
      });

      const student = await this.studentRepo.findById(enrollment.studentId);
      const entityCode = student?.studentCode ?? enrollment.id;
      await logEnrollmentStatusAudit(this.auditLogRepo, {
        action: 'ENROLLMENT:paused',
        enrollmentId,
        entityCode,
        oldStatus: previousStatus,
        newStatus: 'paused',
        actor,
        description: `Tạm dừng ghi danh của học viên ${entityCode}`,
      });

      const withPc = await this.enrollmentRepo.findByStudentWithProgramClass(enrollment.studentId);
      const match = withPc.find((r) => r.enrollment.id === enrollmentId);

      return {
        requiresApproval: false,
        enrollment: enrollmentEntityToResponse(updated, {
          programCode: match?.programCode ?? null,
          programName: match?.programName ?? null,
          classCode: match?.classCode ?? null,
        }),
      };
    }

    const requestCode = generateEimCode('BL');
    const request = await this.pauseRequestRepo.create({
      requestCode,
      enrollmentId,
      requestedBy: actor.id,
      reason,
      sessionsAttendedAtRequest: enrollment.sessionsAttended,
      status: 'pending',
    });

    return { requiresApproval: true, requestId: request.id };
  }
}
