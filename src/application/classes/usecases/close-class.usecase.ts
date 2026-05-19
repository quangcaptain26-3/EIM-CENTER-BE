import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import type { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import {
  IEnrollmentHistoryRepo,
  IEnrollmentRepo,
} from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CloseClassUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly auditRepo: any,
  ) {}

  /**
   * Đóng lớp (`closed`).
   * - Mặc định: chặn nếu còn buổi `pending` (tránh đóng nhầm lớp đang chạy).
   * - `force: true` + role **ADMIN**: bỏ qua kiểm tra pending (giám đốc / vận hành cao nhất) — vẫn ghi audit kèm cờ force.
   */
  async execute(
    userId: string,
    actorRole: string,
    classId: string,
    options?: { force?: boolean },
  ) {
    const targetClass = await this.classRepo.findById(classId);
    if (!targetClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }

    const force = options?.force === true;
    if (force && actorRole !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN mới được đóng lớp khi còn buổi pending (force)',
        403,
      );
    }

    const pendingCnt = await this.sessionRepo.getPendingSessionsCount(classId);
    if (pendingCnt > 0 && !force) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Không thể đóng lớp khi còn buổi học pending',
        422,
      );
    }

    const updated = await this.classRepo.updateStatus(classId, 'closed');
    if (!updated) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Không cập nhật được trạng thái lớp', 500);
    }

    let droppedEnrollmentCount = 0;
    const enrollments = await this.enrollmentRepo.findByClass(classId);
    for (const enr of enrollments) {
      if (enr.status !== 'active' && enr.status !== 'trial') continue;
      const previousStatus = enr.status;
      await this.enrollmentRepo.updateStatus(enr.id, 'dropped');
      await this.enrollmentHistoryRepo.create({
        enrollmentId: enr.id,
        action: 'dropped',
        fromStatus: previousStatus,
        toStatus: 'dropped',
        note: 'Lớp đã đóng (class_closed)',
        changedBy: userId,
      });
      droppedEnrollmentCount += 1;
    }

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:closed', {
        classId,
        updatedBy: userId,
        droppedEnrollmentCount,
        ...(force && pendingCnt > 0 ? { forceClose: true, ignoredPendingSessions: pendingCnt } : {}),
      });
    }

    return { closed: true, droppedEnrollmentCount };
  }
}
