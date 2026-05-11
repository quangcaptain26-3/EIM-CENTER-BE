/**
 * Admin mở khóa học bù — Q15 (special case: reset `makeup_blocked` sau khi trigger đã khóa).
 *
 * Cách vận hành:
 * - Chỉ `ADMIN`. Bắt buộc `reason` (ghi nhận quyết định ngoại lệ).
 * - `UPDATE enrollments SET makeup_blocked = false` giữ nguyên `status`; ghi `audit_logs` old/new.
 */
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { ResetMakeupBlockedBodySchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ResetMakeupBlockedUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    enrollmentId: string,
    dto: unknown,
    actor: { id: string; role: string; userCode?: string; ip?: string },
  ) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN mới được mở khóa học bù (makeup_blocked)',
        403,
      );
    }

    const { reason } = ResetMakeupBlockedBodySchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (!enrollment.makeupBlocked) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Ghi danh không đang bị khóa học bù (makeup_blocked = false)',
        422,
      );
    }

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, enrollment.status, {
      makeupBlocked: false,
    });

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;

    await this.auditLogRepo.log({
      action: 'ENROLLMENT:makeup_unblocked',
      actorId: actor.id,
      actorCode: actor.userCode,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'enrollment',
      entityId: enrollmentId,
      entityCode,
      oldValues: { makeupBlocked: true },
      newValues: { makeupBlocked: false, reason },
      description: `Q15: Admin mở khóa học bù cho ghi danh ${entityCode}. Lý do: ${reason}`,
    });

    return { success: true, enrollmentId, makeupBlocked: updated.makeupBlocked };
  }
}
