/**
 * Thôi học (drop) enrollment — Q13, TH1.
 * Lý do trung tâm (center_unable_*): chỉ ADMIN, tạo HP pending với tổng phiếu thu dương.
 */
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IRefundRequestRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { DropEnrollmentSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { computePaidPositiveTotal } from '../../finance/helpers/center-refund-amount.helper';

const CENTER_FAULT_REASONS = new Set(['center_unable_to_open', 'center_unable_within_60days']);

export class DropEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly transitionRule: EnrollmentTransitionRule,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly refundRequestRepo: IRefundRequestRepo,
    private readonly receiptRepo: IReceiptRepo,
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
    const isCenterFault = normalizedReasonType === 'center_unable_to_open';

    if (isCenterFault && actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Lý do trung tâm không khai giảng chỉ Giám đốc (ADMIN) được chọn. Vui lòng liên hệ Giám đốc hoặc tạo yêu cầu hoàn phí từ menu Tài chính.',
        403,
      );
    }

    if (enrollment.sessionsAttended >= 3 && !isSubjective) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Đã học từ 3 buổi trở lên, chỉ được phép chọn lý do hủy chủ quan từ học viên (subjective_*)',
        422,
      );
    }

    if (enrollment.sessionsAttended < 3) {
      if (!isSubjective && !isCenterFault) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Lý do không hợp lệ. Chỉ chấp nhận center_unable_to_open hoặc subjective_*',
          422,
        );
      }
    }

    let centerRefundAmount = 0;
    let refundReasonType: 'center_unable_to_open' | 'center_unable_within_60days' | null = null;
    if (isCenterFault) {
      centerRefundAmount = await computePaidPositiveTotal(this.receiptRepo, enrollmentId);
      if (centerRefundAmount <= 0) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Không có phiếu thu dương — không thể tạo yêu cầu hoàn trung tâm',
          422,
        );
      }
      refundReasonType =
        reasonType === 'center_unable_within_60days'
          ? 'center_unable_within_60days'
          : 'center_unable_to_open';
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

    if (isCenterFault && refundReasonType) {
      await this.refundRequestRepo.create({
        requestCode: generateEimCode('HP'),
        enrollmentId,
        reasonType: refundReasonType,
        reasonDetail,
        refundAmount: centerRefundAmount,
        status: 'pending',
        requestedBy: actor.id,
      });
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
