/**
 * Thôi học (drop) enrollment — Q13 (chủ quan / trung tâm / đặc biệt), OVERVIEW §4.3, §6.3.
 *
 * Cách vận hành:
 * - Chỉ chuyển `dropped` khi `EnrollmentTransitionRule` cho phép từ trạng thái hiện tại.
 * - `reason_type`: subjective_* (không hoàn phí, bắt buộc chọn mã — Q13), `center_unable_to_open`,
 *   `special_case`, hoặc `center_unable_within_60days` (chuẩn hóa lưu history như `center_unable_to_open`).
 * - Đã học ≥ 3 buổi: chỉ chấp nhận lý do chủ quan (`subjective_*`) — tránh “drop khách quan” giữa khóa mà không qua `refund_request`.
 * - Ghi `enrollment_history` + audit (append-only) — không xóa dữ liệu tài chính đã phát sinh.
 */
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { DropEnrollmentSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';
import { generateEimCode } from '../../../shared/utils/eim-code';

export class DropEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
  ) {}

  async execute(dto: unknown, actor: EnrollmentAuditActor) {
    const { enrollmentId, reasonType, reasonDetail } = DropEnrollmentSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    const canTransition = this.transitionRule.canTransition(enrollment.status, 'dropped', enrollment);
    if (!canTransition) {
      const blockReason = this.transitionRule.getBlockReason(enrollment.status, 'dropped', enrollment);
      throw new AppError(ERROR_CODES.TRANSITION_BLOCKED, blockReason ?? 'Không thể hủy ghi danh', 422);
    }

    const normalizedReasonType =
      reasonType === 'center_unable_within_60days' ? 'center_unable_to_open' : reasonType;
    const allowedReasons = new Set([
      'center_unable_to_open',
      'subjective_no_interest',
      'subjective_schedule_conflict',
      'subjective_financial',
      'subjective_relocation',
      'subjective_other',
      'subjective_class_transfer',
      'special_case',
    ]);
    if (!allowedReasons.has(normalizedReasonType)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'reason_type không hợp lệ', 422);
    }
    const isSubjective = normalizedReasonType.startsWith('subjective_');
    if (enrollment.sessionsAttended >= 3 && !isSubjective) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Đã học từ 3 buổi trở lên, chỉ được phép chọn lý do hủy chủ quan từ học viên (subjective_*)',
        422,
      );
    }

    if (enrollment.sessionsAttended < 3) {
      if (!isSubjective && normalizedReasonType !== 'center_unable_to_open') {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Lý do không hợp lệ. Chỉ chấp nhận center_unable_to_open hoặc subjective_*',
          422,
        );
      }
    }

    const previousStatus = enrollment.status;

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'dropped');

    const note = `${normalizedReasonType}: ${reasonDetail}`;

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'dropped',
      fromStatus: previousStatus,
      toStatus: 'dropped',
      note,
      changedBy: actor.id,
    });

    if (normalizedReasonType === 'center_unable_to_open') {
      await this.db.query(
        `INSERT INTO refund_requests (
          request_code, enrollment_id, reason_type, reason_detail, refund_amount, status, requested_by
        )
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [generateEimCode('HP'), enrollmentId, 'center_unable_to_open', reasonDetail, enrollment.tuitionFee, actor.id],
      );
    }

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;
    await logEnrollmentStatusAudit(this.auditLogRepo, {
      action: 'ENROLLMENT:dropped',
      enrollmentId,
      entityCode,
      oldStatus: previousStatus,
      newStatus: 'dropped',
      actor,
      description: `Hủy ghi danh — học viên ${entityCode}`,
    });

    return updated;
  }
}
