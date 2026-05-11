/**
 * Kích hoạt ghi danh (`status → active`) — Q1 bước 5–6, Q2, OVERVIEW §4–5.
 *
 * Cách vận hành:
 * - Chỉ cho phép từ `reserved` | `pending` | `trial` (trial/reserved không thể “bảo lưu” theo Q33 — pause chặn `active`).
 * - Kiểm tra transition qua `EnrollmentTransitionRule` + phải có ít nhất 1 phiếu thu.
 * - Số tiền cần đạt: nếu `reserved` thì `requiredAmount = max(0, tuition_fee - reservation_fee)` (phí giữ chỗ trừ vào học phí);
 *   các trạng thái khác: `requiredAmount = tuition_fee`. So sánh với `SUM(receipts.amount)`.
 * - Đủ tiền → `updateStatus(..., 'active', { paidAt })` + `enrollment_history` + audit.
 * - Thường được gọi sau CreateReceiptUseCase khi tổng thu đủ; có thể gọi API activate trực tiếp nếu luồng tách bạch.
 */
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
    private readonly db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
  ) {}

  async execute(enrollmentId: string, actor: EnrollmentAuditActor) {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (!['reserved', 'pending', 'trial'].includes(enrollment.status)) {
      throw new AppError(
        ERROR_CODES.TRANSITION_BLOCKED,
        'Chỉ có thể kích hoạt từ reserved, pending hoặc trial',
        422,
      );
    }

    const canTransition = this.transitionRule.canTransition(enrollment.status, 'active', enrollment);
    if (!canTransition) {
      const reason = this.transitionRule.getBlockReason(enrollment.status, 'active', enrollment);
      throw new AppError(ERROR_CODES.TRANSITION_BLOCKED, reason ?? 'Không thể chuyển trạng thái', 422);
    }

    const receiptCountRes = await this.db.query(
      `SELECT COUNT(*)::int AS c FROM receipts WHERE enrollment_id = $1`,
      [enrollment.id],
    );
    const receiptCount = Number(receiptCountRes.rows[0]?.c ?? 0);
    if (receiptCount < 1) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Phải có ít nhất 1 phiếu thu trước khi kích hoạt ghi danh',
        422,
      );
    }

    const requiredAmount =
      enrollment.status === 'reserved'
        ? Math.max(0, enrollment.tuitionFee - enrollment.reservationFee)
        : enrollment.tuitionFee;

    const paidRes = await this.db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM receipts WHERE enrollment_id = $1`,
      [enrollment.id],
    );
    const paidAmount = Number(paidRes.rows[0]?.paid ?? 0);
    const hasPaidEnough = paidAmount >= requiredAmount;
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
