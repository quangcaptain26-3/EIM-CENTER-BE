import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';

export interface IFinanceCheckService {
  checkSufficientReceipt(enrollmentId: string, requiredAmount: number): Promise<boolean>;
}

export class ActivateEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule,
    private readonly financeCheckService: IFinanceCheckService,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(enrollmentId: string, actor: EnrollmentAuditActor) {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (!['pending', 'trial'].includes(enrollment.status)) {
      throw new AppError(
        ERROR_CODES.TRANSITION_BLOCKED,
        'Chỉ có thể kích hoạt từ pending hoặc trial',
        422,
      );
    }

    const canTransition = this.transitionRule.canTransition(enrollment.status, 'active', enrollment);
    if (!canTransition) {
      const reason = this.transitionRule.getBlockReason(enrollment.status, 'active', enrollment);
      throw new AppError(ERROR_CODES.TRANSITION_BLOCKED, reason ?? 'Không thể chuyển trạng thái', 422);
    }

    const hasPaidEnough = await this.financeCheckService.checkSufficientReceipt(enrollment.id, enrollment.tuitionFee);
    if (!hasPaidEnough) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Chưa thanh toán đủ học phí để kích hoạt',
        422,
      );
    }

    const previousStatus = enrollment.status;

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'active', { paidAt: new Date() });

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'activated',
      fromStatus: previousStatus,
      toStatus: 'active',
      changedBy: actor.id,
    });

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;
    await logEnrollmentStatusAudit(this.auditLogRepo, {
      action: 'ENROLLMENT:activated',
      enrollmentId,
      entityCode,
      oldStatus: previousStatus,
      newStatus: 'active',
      actor,
      description: `Kích hoạt ghi danh của học viên ${entityCode}`,
    });

    return updated;
  }
}
