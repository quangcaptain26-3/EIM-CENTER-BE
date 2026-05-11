import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { ISalaryLogRepo } from '../../../domain/auth/repositories/salary-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { toUserResponse } from '../mappers/auth.mapper';

export class GetUserUseCase {
  constructor(
    private readonly userRepo: IUserRepo,
    private readonly salaryLogRepo: ISalaryLogRepo,
  ) {}

  async execute(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }

    const response: any = {
      ...toUserResponse(user),
    };

    if (user.role.code === 'TEACHER') {
      const logs = await this.salaryLogRepo.getRecentLogs(user.id, 10);
      response.salaryChangeLogs = logs;
    }

    return response;
  }
}
