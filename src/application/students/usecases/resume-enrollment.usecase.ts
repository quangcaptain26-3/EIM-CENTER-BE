import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { ResumeEnrollmentSchema } from '../dtos/enrollment.dto';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';

export class ResumeEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly classRepo: IClassRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(enrollmentId: string, body: unknown, actor: EnrollmentAuditActor) {
    const parsed = ResumeEnrollmentSchema.parse(body ?? {});
    const requestedClassId = parsed.targetClassId ?? parsed.classId;
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

    let targetClassId = enrollment.classId;
    if (requestedClassId) {
      const nextClass = await this.classRepo.findById(requestedClassId);
      if (!nextClass) {
        throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp muốn chuyển khi resume', 404);
      }
      if (nextClass.programId !== enrollment.programId) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Chỉ được chuyển sang lớp cùng chương trình khi resume', 422);
      }
      if (!['pending', 'active'].includes(nextClass.status)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp đích không nhận học viên', 422);
      }
      targetClassId = requestedClassId;
    }

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'active', {
      resumedAt: new Date(),
      ...(targetClassId !== enrollment.classId ? { classId: targetClassId } : {}),
    });

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'resumed',
      fromStatus: 'paused',
      toStatus: 'active',
      fromClassId: enrollment.classId,
      toClassId: targetClassId,
      sessionsAtAction: enrollment.sessionsAttended,
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
