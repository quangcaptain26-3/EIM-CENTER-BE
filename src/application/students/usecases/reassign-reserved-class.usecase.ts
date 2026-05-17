/**
 * Q37 — Đổi lớp khi đang giữ chỗ (cùng chương trình), giữ enrollment + receipts.
 */
import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { ReassignReservedClassSchema } from '../dtos/enrollment.dto';
import { resolveClassRefToId } from '../../classes/utils/resolve-class-ref';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ReassignReservedClassUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly classRepo: IClassRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string; ip?: string }) {
    const { enrollmentId, newClassId: newClassRef } = ReassignReservedClassSchema.parse(dto);
    const newClassId = await resolveClassRefToId(this.classRepo, newClassRef);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (enrollment.status !== 'reserved') {
      throw new AppError(
        ERROR_CODES.ENROLLMENT_INVALID_STATUS,
        'Chỉ có thể đổi lớp đang chờ khi ghi danh ở trạng thái reserved',
        422,
      );
    }

    if (enrollment.sessionsAttended > 0) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Không thể đổi lớp sau khi đã có buổi học',
        422,
      );
    }

    const newClass = await this.classRepo.findById(newClassId);
    if (!newClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp mới', 404);
    }

    if (newClass.programId !== enrollment.programId) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Chỉ có thể chuyển sang lớp cùng chương trình học',
        422,
      );
    }

    if (!['pending', 'active'].includes(newClass.status)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Lớp mới không ở trạng thái nhận học viên',
        422,
      );
    }

    if (newClass.id === enrollment.classId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp mới phải khác lớp hiện tại', 422);
    }

    const activeInNewClass = await this.enrollmentRepo.findByClass(newClassId);
    const activeCount = activeInNewClass.filter((e) => ['trial', 'active'].includes(e.status)).length;
    if (activeCount >= newClass.maxCapacity) {
      throw new AppError(
        ERROR_CODES.CLASS_CAPACITY_EXCEEDED,
        'Lớp mới đã đủ sĩ số',
        409,
      );
    }

    const fromClassId = enrollment.classId;

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'reserved', {
      classId: newClassId,
    });

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'class_changed',
      fromStatus: 'reserved',
      toStatus: 'reserved',
      fromClassId,
      toClassId: newClassId,
      sessionsAtAction: 0,
      note: 'Q37: Đổi lớp khi giữ chỗ (cùng chương trình)',
      changedBy: actor.id,
    });

    await this.auditLogRepo.log({
      action: 'ENROLLMENT:reserved_class_reassigned',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'enrollment',
      entityId: enrollment.id,
      description: `Đổi lớp giữ chỗ từ ${fromClassId} sang ${newClassId}`,
    });

    return updated;
  }
}
