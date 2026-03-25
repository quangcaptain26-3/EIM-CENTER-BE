/**
 * R6: Cửa sổ chỉnh sửa feedback/điểm — teacher chỉ được sửa trong X ngày sau session_date.
 * ACADEMIC/ROOT (manager override) bỏ qua rule này.
 */
export const FEEDBACK_EDIT_DAYS = 7;

export function canEditFeedbackByDeadline(
  sessionDate: Date,
  actorRoles: string[],
  today: Date = new Date(),
): { allowed: boolean; reason?: string } {
  const isManagerOverride = actorRoles.includes("ACADEMIC") || actorRoles.includes("ROOT");
  if (isManagerOverride) {
    return { allowed: true };
  }

  const sessionDay = new Date(sessionDate);
  sessionDay.setHours(0, 0, 0, 0);
  const todayDay = new Date(today);
  todayDay.setHours(0, 0, 0, 0);

  const cutoff = new Date(sessionDay);
  cutoff.setDate(cutoff.getDate() + FEEDBACK_EDIT_DAYS);

  if (todayDay > cutoff) {
    return {
      allowed: false,
      reason: `Đã quá hạn chỉnh sửa (${FEEDBACK_EDIT_DAYS} ngày sau buổi học). Liên hệ giáo vụ nếu cần sửa.`,
    };
  }
  return { allowed: true };
}
