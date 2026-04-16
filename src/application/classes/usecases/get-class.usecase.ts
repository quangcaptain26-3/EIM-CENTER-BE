import { IClassRepo, IClassStaffRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class GetClassUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly classStaffRepo: IClassStaffRepo
  ) {}

  async execute(classId: string) {
    const targetClass = await this.classRepo.findById(classId);
    if (!targetClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }

    const staffHistory = await this.classStaffRepo.findActiveByClass(classId);

    // Mock count summary
    const sessionsCount = {
      completed: 0,
      pending: 24,
      cancelled: 0
    };

    return {
      classInfo: targetClass,
      staffHistory,
      sessionsCount
    };
  }
}
