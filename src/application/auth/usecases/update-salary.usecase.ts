import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { ISalaryLogRepo } from '../../../domain/auth/repositories/salary-log.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { UpdateSalaryDto, UpdateSalaryDtoSchema } from '../dtos/user.dto';
import { toUserResponse } from '../mappers/auth.mapper';

export class UpdateSalaryUseCase {
  constructor(
    private readonly userRepo: IUserRepo,
    private readonly salaryLogRepo: ISalaryLogRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    targetUserId: string,
    dto: UpdateSalaryDto,
    actorId: string,
    actorIp: string,
    actorAgent: string,
  ) {
    const data = UpdateSalaryDtoSchema.parse(dto);

    // 1. findById -> USER_NOT_FOUND
    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }

    // 2. Only for TEACHER
    if (targetUser.role.code !== 'TEACHER') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Salary update is only applicable to TEACHER role',
        400,
      );
    }

    const oldSalary = targetUser.salaryPerSession ?? null;
    const oldAllowance = targetUser.allowance ?? null;

    // 3. Update
    const updatedUser = await this.userRepo.update(targetUserId, {
      salaryPerSession: data.salaryPerSession,
      allowance: data.allowance,
    });

    // 4. INSERT logs
    await this.salaryLogRepo.create({
      userId: targetUserId,
      oldSalaryPerSession: oldSalary,
      newSalaryPerSession: data.salaryPerSession ?? null,
      oldAllowance: oldAllowance,
      newAllowance: data.allowance ?? null,
      changedBy: actorId,
      reason: data.reason,
    });

    // 5. Ghi audit log
    await this.auditLogRepo.log({
      action: 'USER:salary_updated',
      actorId,
      actorIp,
      actorAgent,
      entityType: 'user',
      entityId: targetUserId,
      entityCode: targetUser.userCode,
      diff: {
        salaryPerSession: data.salaryPerSession,
        allowance: data.allowance,
        reason: data.reason,
      },
    });

    // 6. Return response + latest logs
    const recentLogs = await this.salaryLogRepo.getRecentLogs(targetUserId, 1);

    return {
      user: toUserResponse(updatedUser),
      recentLogs,
    };
  }
}
