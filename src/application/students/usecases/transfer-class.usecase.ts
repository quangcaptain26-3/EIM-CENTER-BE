import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { TransferClassSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class TransferClassUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly classRepo: IClassRepo,
    private readonly auditLogRepo: IAuditLogRepo
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string; ip?: string }) {
    const { enrollmentId, newClassId } = TransferClassSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (!enrollment.canTransferClass()) {
      if (enrollment.classTransferCount >= 1) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_TRANSFER_LIMIT,
          'Mỗi học viên chỉ được chuyển lớp tối đa 1 lần',
          409,
        );
      }
      if (enrollment.sessionsAttended >= 3) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_TRANSFER_LOCKED,
          'Đã học quá 3 buổi, không thể chuyển lớp',
          409,
        );
      }
      throw new AppError(
        ERROR_CODES.ENROLLMENT_INVALID_STATUS,
        'Không thể chuyển lớp trong trạng thái hiện tại',
        409,
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
    const activeCount = activeInNewClass.filter(e => ['trial', 'active'].includes(e.status)).length;
    if (activeCount >= newClass.maxCapacity) {
      throw new AppError(
        ERROR_CODES.CLASS_CAPACITY_EXCEEDED,
        'Lớp mới đã đủ sĩ số',
        409,
      );
    }

    const fromClassId = enrollment.classId;

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, enrollment.status, {
      classId: newClassId,
      classTransferCount: enrollment.classTransferCount + 1
    });

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'class_changed',
      fromStatus: enrollment.status,
      toStatus: enrollment.status,
      fromClassId,
      toClassId: newClassId,
      sessionsAtAction: enrollment.sessionsAttended,
      changedBy: actor.id,
    });

    await this.auditLogRepo.log({
      action: 'ENROLLMENT:class_transferred',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'enrollment',
      entityId: enrollment.id,
      description: `Chuyển lớp cho học viên từ lớp ${fromClassId} sang lớp ${newClassId}`
    });

    return updated;
  }
}
