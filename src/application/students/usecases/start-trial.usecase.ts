/**
 * Bắt đầu học thử (`pending`/`reserved` → `trial`) — Q1 (tối đa 2 buổi thử), OVERVIEW §4.1.
 *
 * Cách vận hành:
 * - Kiểm tra transition qua `EnrollmentTransitionRule`.
 * - Giới hạn số buổi đã điểm danh tính trial đọc từ `system_config.trial_sessions_limit` (mặc định 2).
 * - Sau trial: đóng học phí → phiếu thu + `activate` (CreateReceiptUseCase / ActivateEnrollmentUseCase).
 */
import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class StartTrialUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule,
    private readonly db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
  ) {}

  private async getTrialSessionsLimit(): Promise<number> {
    const res = await this.db.query(`SELECT value FROM system_config WHERE key = 'trial_sessions_limit' LIMIT 1`);
    const raw = res.rows[0]?.value;
    const n = Number(raw ?? 2);
    return Number.isFinite(n) && n > 0 ? n : 2;
  }

  async execute(enrollmentId: string, actor: { id: string }) {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    const canTransition = this.transitionRule.canTransition(enrollment.status, 'trial', enrollment);
    if (!canTransition) {
      const reason = this.transitionRule.getBlockReason(enrollment.status, 'trial', enrollment);
      throw new AppError(ERROR_CODES.TRANSITION_BLOCKED, reason ?? 'Không thể bắt đầu trial', 422);
    }

    const previousStatus = enrollment.status;
    const trialSessionsLimit = await this.getTrialSessionsLimit();
    if (enrollment.sessionsAttended >= trialSessionsLimit) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Đã vượt số buổi trial tối đa (${trialSessionsLimit})`,
        422,
      );
    }

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'trial');

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'trial_started',
      fromStatus: previousStatus,
      toStatus: 'trial',
      changedBy: actor.id,
    });

    return updated;
  }
}
