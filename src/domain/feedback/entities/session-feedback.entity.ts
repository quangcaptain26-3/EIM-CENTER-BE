export type SessionFeedback = {
  id: string;
  sessionId: string;
  studentId: string;
  attendance?: string | null;
  homework?: string | null;
  participation?: string | null;
  behavior?: string | null;
  languageUsage?: string | null;
  commentText?: string | null;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
};
