import { EnrollmentEntity } from '../../../domain/students/entities/enrollment.entity';

export function enrollmentEntityToResponse(
  e: EnrollmentEntity,
  extra?: { programCode: string | null; programName: string | null; classCode: string | null },
) {
  return {
    id: e.id,
    studentId: e.studentId,
    programId: e.programId,
    classId: e.classId,
    status: e.status,
    tuitionFee: e.tuitionFee,
    sessionsAttended: e.sessionsAttended,
    sessionsAbsent: e.sessionsAbsent,
    classTransferCount: e.classTransferCount,
    pauseCount: e.pauseCount,
    makeupBlocked: e.makeupBlocked,
    reservationFee: e.reservationFee,
    enrolledAt: e.enrolledAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    paidAt: e.paidAt ?? null,
    resumedAt: e.resumedAt ?? null,
    createdBy: e.createdBy,
    programCode: extra?.programCode ?? undefined,
    programName: extra?.programName ?? undefined,
    classCode: extra?.classCode ?? undefined,
  };
}
