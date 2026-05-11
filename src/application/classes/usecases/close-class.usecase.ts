import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CloseClassUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly sessionRepo: any,
    private readonly auditRepo: any
  ) {}

  async execute(userId: string, classId: string) {
    const targetClass = await this.classRepo.findById(classId);
    if (!targetClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }

    if (this.sessionRepo) {
      const pendingCnt = await this.sessionRepo.getPendingSessionsCount(classId);
      if (pendingCnt > 0) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Không thể đóng lớp khi còn buổi học pending',
          422,
        );
      }
    }

    const updated = await this.classRepo.updateStatus(classId, 'closed');
    if (!updated) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Không cập nhật được trạng thái lớp', 500);
    }

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:closed', { classId, updatedBy: userId });
    }

    return true;
  }
}
