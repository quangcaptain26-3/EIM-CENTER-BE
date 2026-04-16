import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IProgramRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IStudentRepo, IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';

export class CompleteEnrollmentUseCase {
  constructor(
    private readonly studentRepo: IStudentRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly programRepo: IProgramRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(enrollmentId: string, actor: EnrollmentAuditActor & { role: string }) {
    if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền hoàn thành khóa học', 403);
    }

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (enrollment.sessionsAttended < 24) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Cần tham gia tối thiểu 24 buổi để hoàn thành',
        422,
      );
    }

    const statusBefore = enrollment.status;

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'completed');

    const program = await this.programRepo.findById(enrollment.programId);
    if (program) {
      const nextLevel = program.getNextLevelCode();
      if (nextLevel) {
        await this.studentRepo.update(enrollment.studentId, { currentLevel: nextLevel });
      } else {
        await this.studentRepo.update(enrollment.studentId, { currentLevel: program.code });
      }
    }

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'completed',
      fromStatus: statusBefore,
      toStatus: 'completed',
      changedBy: actor.id,
    });

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;
    await logEnrollmentStatusAudit(this.auditLogRepo, {
      action: 'ENROLLMENT:completed',
      enrollmentId,
      entityCode,
      oldStatus: statusBefore,
      newStatus: 'completed',
      actor,
      description: `Hoàn thành khóa học — học viên ${entityCode}`,
    });

    return updated;
  }
}
