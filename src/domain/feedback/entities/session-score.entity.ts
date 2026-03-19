export type ScoreType = 'TEST' | 'MIDTERM' | 'FINAL';

export type SessionScore = {
  id: string;
  sessionId: string;
  studentId: string;
  scoreType: ScoreType;
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
  total?: number | null;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
