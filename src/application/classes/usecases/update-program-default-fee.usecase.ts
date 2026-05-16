/**
 * Cập nhật học phí mặc định chương trình — chỉ ADMIN.
 * Không cascade sang enrollments (snapshot giữ nguyên).
 */
import { IProgramRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { UpdateProgramDefaultFeeDto } from '../dtos/program.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class UpdateProgramDefaultFeeUseCase {
  constructor(
    private readonly programRepo: IProgramRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    programId: string,
    data: unknown,
    actor: { id: string; role: string; ip?: string },
  ) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN mới được chỉnh học phí chương trình',
        403,
      );
    }

    const payload = UpdateProgramDefaultFeeDto.parse(data);

    const existing = await this.programRepo.findById(programId);
    if (!existing) {
      throw new AppError(ERROR_CODES.PROGRAM_NOT_FOUND, 'Không tìm thấy chương trình', 404);
    }

    if (existing.defaultFee === payload.defaultFee) {
      return existing;
    }

    const updated = await this.programRepo.updateDefaultFee(programId, payload.defaultFee);
    if (!updated) {
      throw new AppError(ERROR_CODES.PROGRAM_NOT_FOUND, 'Không tìm thấy chương trình', 404);
    }

    await this.auditLogRepo.log({
      action: 'PROGRAM:default_fee_updated',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'program',
      entityId: updated.id,
      entityCode: updated.code,
      oldValues: { defaultFee: existing.defaultFee },
      newValues: { defaultFee: updated.defaultFee },
      description: `Học phí mặc định ${updated.code}: ${existing.defaultFee} → ${updated.defaultFee}`,
    });

    return updated;
  }
}
