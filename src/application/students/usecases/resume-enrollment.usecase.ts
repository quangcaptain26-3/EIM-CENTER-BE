import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';

export class ResumeEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(enrollmentId: string, actor: EnrollmentAuditActor) {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (enrollment.status !== 'paused') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Chỉ có thể khôi phục khi đang ở trạng thái tạm dừng (paused)',
        422,
      );
    }

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'active');

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'resumed',
      fromStatus: 'paused',
      toStatus: 'active',
      changedBy: actor.id,
    });

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;
    await logEnrollmentStatusAudit(this.auditLogRepo, {
      action: 'ENROLLMENT:resumed',
      enrollmentId,
      entityCode,
      oldStatus: 'paused',
      newStatus: 'active',
      actor,
      description: `Khôi phục ghi danh sau bảo lưu — học viên ${entityCode}`,
    });

    return updated;
  }
}
