import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { toUserResponse } from '../mappers/auth.mapper';

export class MeUseCase {
  constructor(private readonly userRepo: IUserRepo) {}

  async execute(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }
    return toUserResponse(user);
  }
}
