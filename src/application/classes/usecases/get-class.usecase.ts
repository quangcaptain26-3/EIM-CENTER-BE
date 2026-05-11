import type { Pool } from 'pg';
import { IClassRepo, IClassStaffRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { ensureRosterViewAccess } from '../guards/ensure-class-access-by-role';

export class GetClassUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly classStaffRepo: IClassStaffRepo,
    /** DB cho guard phạm vi lớp — muốn đổi ai được xem chi tiết lớp: sửa ensureRosterViewAccess + policy roles */
    private readonly db: Pick<Pool, 'query'>,
  ) {}

  async execute(classId: string, actor: { id: string; role: string }) {
    // GET /classes/:id — cùng "cần biết" như roster (GV chỉ lớp chủ nhiệm active). Muốn mở cover: đồng bộ guard với RecordAttendance.
    await ensureRosterViewAccess(this.db, actor, classId);
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
