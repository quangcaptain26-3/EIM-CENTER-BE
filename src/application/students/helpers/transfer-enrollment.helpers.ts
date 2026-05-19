import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { COURSE_TOTAL_SESSIONS } from './resume-class.helpers';

export type ReceiptAmountRow = { amount: number };

export function computeSessionsRemaining(sessionsAttended: number): number {
  return Math.max(0, COURSE_TOTAL_SESSIONS - (sessionsAttended ?? 0));
}

export function computeRemainingTuitionValue(tuitionFee: number, sessionsRemaining: number): number {
  if (sessionsRemaining <= 0) return 0;
  return Math.floor((tuitionFee * sessionsRemaining) / COURSE_TOTAL_SESSIONS);
}

export function computeNetPaid(receipts: ReceiptAmountRow[]): number {
  const totalPaid = receipts.filter((r) => r.amount > 0).reduce((sum, r) => sum + r.amount, 0);
  const totalRefunded = receipts
    .filter((r) => r.amount < 0)
    .reduce((sum, r) => sum + Math.abs(r.amount), 0);
  return totalPaid - totalRefunded;
}

export function computeTransferAmount(
  tuitionFee: number,
  sessionsAttended: number,
  receipts: ReceiptAmountRow[],
): { sessionsRemaining: number; remainingTuitionValue: number; netPaid: number; amountTransferred: number } {
  const sessionsRemaining = computeSessionsRemaining(sessionsAttended);
  const remainingTuitionValue = computeRemainingTuitionValue(tuitionFee, sessionsRemaining);
  const netPaid = computeNetPaid(receipts);
  const amountTransferred = Math.min(remainingTuitionValue, Math.max(0, netPaid));
  return { sessionsRemaining, remainingTuitionValue, netPaid, amountTransferred };
}

export function assertSameProgram(fromProgramId: string, toProgramId: string): void {
  if (fromProgramId !== toProgramId) {
    throw new AppError(
      ERROR_CODES.ENROLLMENT_TRANSFER_PROGRAM_MISMATCH,
      'Lớp đích phải cùng chương trình (cấp độ) với ghi danh nguồn',
      422,
    );
  }
}

export function assertTargetClassBehindStudent(
  classCompletedSessions: number,
  sessionsAttended: number,
): void {
  if (classCompletedSessions >= sessionsAttended) {
    throw new AppError(
      ERROR_CODES.ENROLLMENT_TRANSFER_CLASS_PROGRESS,
      `Lớp đích đã học ${classCompletedSessions} buổi, phải ít hơn ${sessionsAttended} buổi học viên nguồn đã học`,
      422,
    );
  }
}

export async function getClassCompletedSessions(
  db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: { c?: number }[] }> },
  classId: string,
): Promise<number> {
  const res = await db.query(
    `SELECT COUNT(*)::int AS c FROM sessions WHERE class_id = $1 AND status = 'completed'`,
    [classId],
  );
  return Number(res.rows[0]?.c ?? 0);
}
