import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class SoftDeleteUserUseCase {
  constructor(
    private readonly userRepo: IUserRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    targetUserId: string,
    actorId: string,
    actorIp: string,
    actorAgent: string,
  ) {
    // Không tự xóa mình
    if (targetUserId === actorId) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Cannot self-delete account',
        400,
      );
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }

    // Soft delete
    await this.userRepo.softDelete(targetUserId);

    // Audit log
    await this.auditLogRepo.log({
      action: 'USER:deleted',
      actorId,
      actorIp,
      actorAgent,
      entityType: 'user',
      entityId: targetUserId,
      entityCode: targetUser.userCode,
    });
  }
}
