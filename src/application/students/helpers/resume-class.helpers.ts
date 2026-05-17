/** Khóa chuẩn 24 buổi — đồng bộ complete-enrollment. */
export const COURSE_TOTAL_SESSIONS = 24;

export type ResumeWarningLevel = 'ok' | 'insufficient_sessions' | 'closed' | 'full';

export type ResumeClassTier = 'near_progress' | 'new_class' | 'other';

export interface ResumeClassCandidate {
  classId: string;
  classCode: string;
  enrollmentCount: number;
  maxCapacity: number;
  completedSessions: number;
  pendingSessions: number;
  availableSlots: number;
  progressDelta: number;
}

export function remainingStudentSessions(sessionsAttended: number): number {
  return Math.max(0, COURSE_TOTAL_SESSIONS - (sessionsAttended ?? 0));
}

export function classifyTier(
  completedSessions: number,
  sessionsAttended: number,
  pendingSessions: number,
): ResumeClassTier {
  const delta = Math.abs(completedSessions - sessionsAttended);
  if (pendingSessions >= 1 && delta <= 3) return 'near_progress';
  if (completedSessions <= 3) return 'new_class';
  return 'other';
}

const TIER_ORDER: Record<ResumeClassTier, number> = {
  near_progress: 0,
  new_class: 1,
  other: 2,
};

export function sortResumeCandidates(
  rows: ResumeClassCandidate[],
  sessionsAttended: number,
): ResumeClassCandidate[] {
  return [...rows]
    .map((r) => ({
      ...r,
      progressDelta: Math.abs(r.completedSessions - sessionsAttended),
      tier: classifyTier(r.completedSessions, sessionsAttended, r.pendingSessions),
    }))
    .sort((a, b) => {
      const ta = TIER_ORDER[(a as ResumeClassCandidate & { tier: ResumeClassTier }).tier];
      const tb = TIER_ORDER[(b as ResumeClassCandidate & { tier: ResumeClassTier }).tier];
      if (ta !== tb) return ta - tb;
      if (a.enrollmentCount !== b.enrollmentCount) return a.enrollmentCount - b.enrollmentCount;
      if (b.availableSlots !== a.availableSlots) return b.availableSlots - a.availableSlots;
      return a.progressDelta - b.progressDelta;
    });
}

export function buildSameClassResumeInfo(params: {
  classId: string;
  classCode: string;
  classStatus: string;
  maxCapacity: number;
  enrollmentCount: number;
  pendingSessions: number;
  sessionsAttended: number;
  isSameEnrollmentSeat: boolean;
}): {
  warningLevel: ResumeWarningLevel;
  message: string;
  remainingStudent: number;
} {
  const remainingStudent = remainingStudentSessions(params.sessionsAttended);

  if (params.classStatus === 'closed') {
    return {
      warningLevel: 'closed',
      message: `Lớp ${params.classCode} đã đóng — cần chọn lớp khác cùng chương trình.`,
      remainingStudent,
    };
  }

  const atCapacity =
    !params.isSameEnrollmentSeat && params.enrollmentCount >= params.maxCapacity;
  if (atCapacity) {
    return {
      warningLevel: 'full',
      message: `Lớp ${params.classCode} đã đủ sĩ số (${params.enrollmentCount}/${params.maxCapacity}).`,
      remainingStudent,
    };
  }

  if (params.pendingSessions < remainingStudent) {
    return {
      warningLevel: 'insufficient_sessions',
      message: `Lớp ${params.classCode} chỉ còn ${params.pendingSessions} buổi pending; học viên cần khoảng ${remainingStudent} buổi nữa để hoàn thành khóa. Nên xem lớp gợi ý bên dưới.`,
      remainingStudent,
    };
  }

  return {
    warningLevel: 'ok',
    message: `Tiếp tục lớp ${params.classCode} — còn ${params.pendingSessions} buổi pending, đủ cho ~${remainingStudent} buổi còn lại của học viên.`,
    remainingStudent,
  };
}

export function requiresInsufficientSessionsAck(warningLevel: ResumeWarningLevel): boolean {
  return warningLevel === 'insufficient_sessions';
}
