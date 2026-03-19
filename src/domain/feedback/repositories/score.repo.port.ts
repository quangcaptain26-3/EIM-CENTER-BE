import { ScoreType, SessionScore } from '../entities/session-score.entity';

type DbTx = { query: (text: string, params?: unknown[]) => Promise<unknown> };

export interface ScoreRepoPort {
  upsertMany(
    items: Array<{
      sessionId: string;
      studentId: string;
      scoreType: ScoreType;
      listening?: number | null;
      reading?: number | null;
      writing?: number | null;
      speaking?: number | null;
      total?: number | null;
      note?: string | null;
    }>,
    options?: { tx?: DbTx }
  ): Promise<SessionScore[]>;

  listByStudent(studentId: string, limit?: number, offset?: number): Promise<SessionScore[]>;

  /**
   * Lấy danh sách điểm theo session, phục vụ cho export báo cáo.
   */
  listBySession(sessionId: string): Promise<SessionScore[]>;
}
