import { IMakeupSessionRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { CompleteMakeupSessionSchema } from '../dtos/attendance.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CompleteMakeupSessionUseCase {
  constructor(
    private readonly makeupSessionRepo: IMakeupSessionRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly auditLogRepo: IAuditLogRepo
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string; ip?: string }) {
    const { makeupSessionId } = CompleteMakeupSessionSchema.parse(dto);

    const makeupSession = await this.makeupSessionRepo.findById(makeupSessionId);
    if (!makeupSession) {
      throw new AppError(ERROR_CODES.MAKEUP_SESSION_NOT_FOUND, 'Không tìm thấy buổi học bù', 404);
    }

    if (makeupSession.status === 'completed') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Buổi học bù đã được đánh dấu hoàn thành',
        422,
      );
    }

    const enrollment = await this.enrollmentRepo.findById(makeupSession.enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    await this.makeupSessionRepo.updateStatus(makeupSessionId, 'completed');

    await this.enrollmentRepo.updateStatus(enrollment.id, enrollment.status, {
      sessionsAttended: enrollment.sessionsAttended + 1
    });

    await this.auditLogRepo.log({
      action: 'ATTENDANCE:makeup_completed',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'makeup_session',
      entityId: makeupSessionId,
      description: `Hoàn thành buổi học bù ${makeupSession.makeupCode}`
    });

    return { success: true };
  }
}
