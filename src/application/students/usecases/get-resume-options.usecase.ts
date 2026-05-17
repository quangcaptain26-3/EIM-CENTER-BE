/**
 * Gợi ý lớp & cảnh báo trước khi tiếp tục học sau bảo lưu — GET …/resume-options (Q7c).
 */
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import {
  buildSameClassResumeInfo,
  classifyTier,
  remainingStudentSessions,
  sortResumeCandidates,
  type ResumeClassTier,
} from '../helpers/resume-class.helpers';

export class GetResumeOptionsUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly classRepo: IClassRepo,
    private readonly sessionRepo: ISessionRepo,
  ) {}

  async execute(enrollmentId: string) {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }
    if (enrollment.status !== 'paused') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Chỉ xem gợi ý khi ghi danh đang bảo lưu (paused)',
        422,
      );
    }

    const sessionsAttended = enrollment.sessionsAttended ?? 0;
    const remainingStudent = remainingStudentSessions(sessionsAttended);
    const currentClassId = enrollment.classId;

    let classCode = '';
    let pendingOnCurrent = 0;
    let enrollmentCountOnCurrent = 0;
    let maxCapacityOnCurrent = 12;
    let classStatus = 'pending';

    if (currentClassId) {
      const currentClass = await this.classRepo.findById(currentClassId);
      if (currentClass) {
        classCode = currentClass.classCode;
        classStatus = currentClass.status;
        maxCapacityOnCurrent = currentClass.maxCapacity;
        pendingOnCurrent = await this.sessionRepo.getPendingSessionsCount(currentClassId);
        const inClass = await this.enrollmentRepo.findByClass(currentClassId);
        enrollmentCountOnCurrent = inClass.filter((e) =>
          ['trial', 'active', 'reserved'].includes(e.status),
        ).length;
      }
    }

    const sameClassInfo = currentClassId
      ? buildSameClassResumeInfo({
          classId: currentClassId,
          classCode: classCode || currentClassId.slice(0, 8),
          classStatus,
          maxCapacity: maxCapacityOnCurrent,
          enrollmentCount: enrollmentCountOnCurrent,
          pendingSessions: pendingOnCurrent,
          sessionsAttended,
          isSameEnrollmentSeat: true,
        })
      : {
          warningLevel: 'closed' as const,
          message: 'Chưa gán lớp — chọn lớp mới khi tiếp tục học.',
          remainingStudent,
        };

    const rawCandidates = await this.classRepo.findResumeClassCandidates(
      enrollment.programId,
      currentClassId,
    );

    const sorted = sortResumeCandidates(
      rawCandidates.map((r) => ({
        classId: r.classId,
        classCode: r.classCode,
        enrollmentCount: r.enrollmentCount,
        maxCapacity: r.maxCapacity,
        completedSessions: r.completedSessions,
        pendingSessions: r.pendingSessions,
        availableSlots: r.availableSlots,
        progressDelta: Math.abs(r.completedSessions - sessionsAttended),
      })),
      sessionsAttended,
    );

    const suggestedClasses = sorted.map((r) => {
      const tier = classifyTier(r.completedSessions, sessionsAttended, r.pendingSessions);
      return {
        classId: r.classId,
        classCode: r.classCode,
        enrollmentCount: r.enrollmentCount,
        maxCapacity: r.maxCapacity,
        completedSessions: r.completedSessions,
        pendingSessions: r.pendingSessions,
        progressDelta: r.progressDelta,
        tier: tier as ResumeClassTier,
        availableSlots: r.availableSlots,
      };
    });

    const recommendedClassId =
      suggestedClasses.length > 0 ? suggestedClasses[0].classId : undefined;

    return {
      enrollment: {
        sessionsAttended,
        programId: enrollment.programId,
        classId: currentClassId,
        classCode: classCode || null,
        remainingStudent,
      },
      sameClass: currentClassId
        ? {
            classId: currentClassId,
            classCode,
            pendingSessions: pendingOnCurrent,
            remainingStudent,
            warningLevel: sameClassInfo.warningLevel,
            message: sameClassInfo.message,
          }
        : null,
      suggestedClasses,
      recommendedClassId,
    };
  }
}
