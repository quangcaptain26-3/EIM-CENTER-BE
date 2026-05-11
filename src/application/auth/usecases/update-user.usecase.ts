import { Pool } from 'pg';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { refreshSearchViews } from '../../../infrastructure/db/refresh-views';
import { logger } from '../../../shared/logger';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { UpdateUserDto, UpdateUserDtoSchema } from '../dtos/user.dto';
import { toUserResponse } from '../mappers/auth.mapper';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly db: Pool,
  ) {}

  async execute(
    targetUserId: string,
    dto: UpdateUserDto,
    actorId: string,
    actorRoleCode: string,
    actorIp: string,
    actorAgent: string,
  ) {
    const data = UpdateUserDtoSchema.parse(dto);

    // 1. findById -> throw USER_NOT_FOUND
    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }

    // 2. Check quyền
    // ADMIN can update all fields
    // Self can only update personal fields
    const isSelf = targetUserId === actorId;
    const isAdmin = actorRoleCode === 'ADMIN';

    if (!isAdmin && !isSelf) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Cannot update another user profile',
        403,
      );
    }

    const updateData: Partial<UpdateUserDto> = {};
    if (isAdmin) {
      Object.assign(updateData, data);
    } else {
      // isSelf -> only personal fields allowed
      const personalFields: (keyof UpdateUserDto)[] = [
        'fullName',
        'gender',
        'dob',
        'phone',
        'address',
      ];
      for (const field of personalFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field] as any;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return toUserResponse(targetUser);
    }

    // capture old values for diff
    const oldValues: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      oldValues[key] = (targetUser as any)[key];
    }

    // 3. UDPATE user
    const updated = await this.userRepo.update(targetUserId, updateData);

    // 4. Ghi audit log
    await this.auditLogRepo.log({
      action: 'USER:updated',
      actorId,
      actorIp,
      actorRole: actorRoleCode,
      actorAgent,
      entityType: 'user',
      entityId: updated.id,
      entityCode: updated.userCode,
      oldValues,
      newValues: updateData,
      diff: updateData, // Only changed fields
    });

    void refreshSearchViews(this.db).catch((err) => logger.error(err));

    return toUserResponse(updated);
  }
}
