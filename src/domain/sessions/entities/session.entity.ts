// src/domain/sessions/entities/session.entity.ts

/**
 * Loại buổi học
 */
export type SessionType = "NORMAL" | "TEST" | "MIDTERM" | "FINAL";

/**
 * Trạng thái buổi học
 */
export type SessionStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED" | "MAKEUP";

/**
 * Entity Buổi học
 */
export interface Session {
  id: string;
  classId: string;
  sessionDate: Date;
  sessionStatus: SessionStatus;
  unitNo: number;
  lessonNo: number;
  /**
   * Mẫu gộp bài của curriculum (vd: "1&2").
   * - Với buổi NORMAL: thể hiện cụm bài nằm trong cùng một buổi.
   * - Với buổi khảo thí (lessonNo = 0): để null.
   */
  lessonPattern?: string | null;
  sessionType: SessionType;
  mainTeacherId?: string | null;
  coverTeacherId?: string | null;
  createdAt: Date;
}

/**
 * Entity Lịch sử đổi lịch buổi học
 */
export interface SessionReschedule {
  id: string;
  sessionId: string;
  fromDate: Date;
  toDate: Date;
  note?: string | null;
  changedBy?: string | null;
  changedAt: Date;
}
