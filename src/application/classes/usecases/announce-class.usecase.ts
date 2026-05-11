/**
 * Công bố lớp sắp khai giảng (`announced_at`) — Q12, OVERVIEW §10.1–10.2.
 *
 * Cách vận hành:
 * - ADMIN/ACADEMIC. Gán `announced_at` một lần; lớp sau đó có thể hiển thị public trên `/upcoming` theo view/repo.
 * - Không cho công bố lặp (409 nếu đã announced).
 */
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class AnnounceClassUseCase {
  constructor(private readonly classRepo: IClassRepo) {}

  async execute(actorRole: string, classId: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN hoặc ACADEMIC mới công bố lớp',
        403,
      );
    }

    const targetClass = await this.classRepo.findById(classId);
    if (!targetClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }

    if ((targetClass as { announced_at?: Date; announcedAt?: Date }).announced_at || targetClass.announcedAt) {
      throw new AppError(ERROR_CODES.CLASS_ALREADY_ANNOUNCED, 'Lớp đã được công bố trước đó', 409);
    }

    const ok = await this.classRepo.announce(classId);
    if (!ok) {
      throw new AppError(ERROR_CODES.CLASS_ALREADY_ANNOUNCED, 'Lớp đã được công bố trước đó', 409);
    }

    return this.classRepo.findById(classId);
  }
}
