import { SessionFeedback } from '../entities/session-feedback.entity';

type DbTx = { query: (text: string, params?: unknown[]) => Promise<unknown> };

export interface FeedbackRepoPort {
  listBySession(sessionId: string): Promise<SessionFeedback[]>;
  upsertMany(
    items: Array<{
      sessionId: string;
      studentId: string;
      teacherId: string;
      attendance?: string | null;
      homework?: string | null;
      participation?: string | null;
      behavior?: string | null;
      languageUsage?: string | null;
      commentText?: string | null;
    }>,
    options?: { tx?: DbTx }
  ): Promise<SessionFeedback[]>;
  listByStudent(studentId: string, limit?: number, offset?: number): Promise<SessionFeedback[]>;

  /** Đếm số buổi vắng theo enrollment (chỉ enrollment có class_id) */
  getAttendanceSummaries(enrollmentIds: string[]): Promise<Map<string, { absentCount: number; totalSessions: number }>>;
}
