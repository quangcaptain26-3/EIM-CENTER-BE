import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class StartTrialUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule
  ) {}

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
