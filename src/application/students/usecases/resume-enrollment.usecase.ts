/**
 * Tiếp tục học sau bảo lưu (POST …/resume) — Q7.
 *
 * Cách vận hành:
 * - Chỉ khi `status === 'paused'`.
 * - Mặc định giữ nguyên `class_id`. Nếu body có `targetClassId` / `classId`: validate lớp đích cùng `program_id`,
 *   trạng thái `pending` hoặc `active`, còn chỗ (trừ resume cùng lớp cũ), rồi ghi `class_id` mới nếu đổi.
 * - Cảnh báo lớp sắp hết buổi: cần `acknowledgeInsufficientSessions` khi pending < buổi còn lại của học viên.
 * - Chuyển `paused → active`, set `resumed_at`, ghi `enrollment_history` + audit.
 * - Response kèm `nextSessionNo`, `pendingSessionsOnClass`, `warning`.
 */
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo, IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { ResumeEnrollmentSchema } from '../dtos/enrollment.dto';
import {
  buildSameClassResumeInfo,
  requiresInsufficientSessionsAck,
} from '../helpers/resume-class.helpers';
import { logEnrollmentStatusAudit, type EnrollmentAuditActor } from '../helpers/log-enrollment-audit';
import { enrollmentEntityToResponse } from '../mappers/enrollment.mapper';

export class ResumeEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly classRepo: IClassRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(enrollmentId: string, body: unknown, actor: EnrollmentAuditActor) {
    const parsed = ResumeEnrollmentSchema.parse(body ?? {});
    const requestedClassId = parsed.targetClassId ?? parsed.classId;
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (enrollment.status !== 'paused') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Chỉ có thể khôi phục khi đang ở trạng thái tạm dừng (paused)',
        422,
      );
    }

    let targetClassId = enrollment.classId;
    if (requestedClassId) {
      targetClassId = requestedClassId;
    }

    if (!targetClassId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cần chọn lớp khi tiếp tục học', 422);
    }

    const nextClass = await this.classRepo.findById(targetClassId);
    if (!nextClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp muốn chuyển khi resume', 404);
    }
    if (nextClass.programId !== enrollment.programId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Chỉ được chuyển sang lớp cùng chương trình khi resume', 422);
    }
    if (!['pending', 'active'].includes(nextClass.status)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp đích không nhận học viên', 422);
    }

    const isSameClass = targetClassId === enrollment.classId;
    const inClass = await this.enrollmentRepo.findByClass(targetClassId);
    const activeCount = inClass.filter((e) => ['trial', 'active', 'reserved'].includes(e.status)).length;

    if (!isSameClass && activeCount >= nextClass.maxCapacity) {
      throw new AppError(ERROR_CODES.CLASS_CAPACITY_EXCEEDED, 'Lớp đích đã đủ sĩ số', 409);
    }

    const pendingSessionsOnClass = await this.sessionRepo.getPendingSessionsCount(targetClassId);
    const sameClassInfo = buildSameClassResumeInfo({
      classId: targetClassId,
      classCode: nextClass.classCode,
      classStatus: nextClass.status,
      maxCapacity: nextClass.maxCapacity,
      enrollmentCount: activeCount,
      pendingSessions: pendingSessionsOnClass,
      sessionsAttended: enrollment.sessionsAttended ?? 0,
      isSameEnrollmentSeat: isSameClass,
    });

    if (sameClassInfo.warningLevel === 'closed') {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, sameClassInfo.message, 422);
    }
    if (sameClassInfo.warningLevel === 'full') {
      throw new AppError(ERROR_CODES.CLASS_CAPACITY_EXCEEDED, sameClassInfo.message, 409);
    }
    if (
      requiresInsufficientSessionsAck(sameClassInfo.warningLevel) &&
      !parsed.acknowledgeInsufficientSessions
    ) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Lớp còn ít buổi hơn số buổi học viên cần — cần xác nhận acknowledgeInsufficientSessions',
        422,
      );
    }

    const updated = await this.enrollmentRepo.updateStatus(enrollmentId, 'active', {
      resumedAt: new Date(),
      ...(targetClassId !== enrollment.classId ? { classId: targetClassId } : {}),
    });

    await this.enrollmentHistoryRepo.create({
      enrollmentId,
      action: 'resumed',
      fromStatus: 'paused',
      toStatus: 'active',
      fromClassId: enrollment.classId,
      toClassId: targetClassId,
      sessionsAtAction: enrollment.sessionsAttended,
      changedBy: actor.id,
    });

    const student = await this.studentRepo.findById(enrollment.studentId);
    const entityCode = student?.studentCode ?? enrollment.id;
    await logEnrollmentStatusAudit(this.auditLogRepo, {
      action: 'ENROLLMENT:resumed',
      enrollmentId,
      entityCode,
      oldStatus: 'paused',
      newStatus: 'active',
      actor,
      description: `Khôi phục ghi danh sau bảo lưu — học viên ${entityCode}`,
    });

    const nextSessionNo = await this.sessionRepo.getFirstPendingSessionNo(targetClassId);
    const withPc = await this.enrollmentRepo.findByStudentWithProgramClass(enrollment.studentId);
    const match = withPc.find((r) => r.enrollment.id === enrollmentId);

    return {
      ...enrollmentEntityToResponse(updated, {
        programCode: match?.programCode ?? null,
        programName: match?.programName ?? null,
        classCode: match?.classCode ?? nextClass.classCode,
      }),
      nextSessionNo,
      pendingSessionsOnClass,
      warning:
        sameClassInfo.warningLevel === 'insufficient_sessions' ? sameClassInfo.message : null,
    };
  }
}
