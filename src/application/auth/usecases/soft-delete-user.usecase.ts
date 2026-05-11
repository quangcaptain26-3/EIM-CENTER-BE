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
        ERROR_CODES.SELF_DELETE_NOT_ALLOWED,
        'Không thể tự xóa tài khoản của chính mình',
        409,
      );
    }

    const [targetUser, actorUser] = await Promise.all([
      this.userRepo.findById(targetUserId),
      this.userRepo.findById(actorId),
    ]);
    if (!targetUser) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }
    if (!actorUser) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'Actor user not found', 404);
    }

    // Chặn xóa admin cuối cùng ở tầng app (DB trigger là lớp bảo vệ thứ 2).
    if (targetUser.role.code === 'ADMIN') {
      const activeAdmins = await this.userRepo.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new AppError(
          ERROR_CODES.LAST_ADMIN_DELETE,
          'Không thể xóa admin cuối cùng của hệ thống',
          409,
        );
      }
    }

    // Xóa mềm để vẫn giữ lịch sử cho audit/report.
    await this.userRepo.softDelete(targetUserId);

    // Ghi dấu vết thao tác: ai xóa ai, phục vụ truy vết khi có khiếu nại.
    await this.auditLogRepo.log({
      action: 'USER:deleted',
      actorId,
      actorIp,
      actorAgent,
      entityType: 'user',
      entityId: targetUserId,
      entityCode: targetUser.userCode,
      actorCode: actorUser.userCode,
      diff: {
        actor_code: actorUser.userCode,
        target_code: targetUser.userCode,
      },
    });
  }
}
