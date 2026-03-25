import { Pool, type PoolClient } from "pg";
import { ScoreType, SessionScore } from "../../../../domain/feedback/entities/session-score.entity";
import { ScoreRepoPort } from "../../../../domain/feedback/repositories/score.repo.port";

export class PostgresScoreRepository implements ScoreRepoPort {
  constructor(private readonly pool: Pool) {}

  async listByStudent(studentId: string, limit: number = 20, offset: number = 0): Promise<SessionScore[]> {
    const query = `
      SELECT * FROM session_scores
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await this.pool.query(query, [studentId, limit, offset]);
    return result.rows.map(this.mapToEntity);
  }

  async listBySession(sessionId: string): Promise<SessionScore[]> {
    const query = `
      SELECT *
      FROM session_scores
      WHERE session_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await this.pool.query(query, [sessionId]);
    return result.rows.map(this.mapToEntity);
  }

  async upsertMany(
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
    options?: { tx?: PoolClient }
  ): Promise<SessionScore[]> {
    if (items.length === 0) return [];

    const externalTx = options?.tx;
    const client = externalTx ?? (await this.pool.connect());
    // PoolClient.query phụ thuộc vào `this`, nên luôn gọi qua object (tránh mất context khi truyền hàm).
    const execQuery = (text: string, params?: unknown[]) => (client as any).query(text, params);

    // Chunk để tránh query quá dài + giảm áp lực lên PostgreSQL.
    const BATCH_SIZE = 200;
    try {
      if (!externalTx) await client.query("BEGIN");

      const upserted: SessionScore[] = [];

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);

        const values: unknown[] = [];
        const tuples: string[] = [];

        // Mỗi tuple có 9 placeholder (trừ updated_at=NOW())
        for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
          const item = chunk[rowIndex];
          const base = rowIndex * 9;

          values.push(
            item.sessionId,
            item.studentId,
            item.scoreType,
            item.listening ?? null,
            item.reading ?? null,
            item.writing ?? null,
            item.speaking ?? null,
            item.total ?? null,
            item.note ?? null,
          );

          const p1 = base + 1;
          tuples.push(
            `($${p1}, $${p1 + 1}, $${p1 + 2}, $${p1 + 3}, $${p1 + 4}, $${p1 + 5}, $${p1 + 6}, $${p1 + 7}, $${p1 + 8}, NOW())`,
          );
        }

        const query = `
          INSERT INTO session_scores (
            session_id, student_id, score_type,
            listening, reading, writing, speaking, total, note,
            updated_at
          )
          VALUES ${tuples.join(",")}
          ON CONFLICT (session_id, student_id, score_type)
          DO UPDATE SET
            listening = EXCLUDED.listening,
            reading = EXCLUDED.reading,
            writing = EXCLUDED.writing,
            speaking = EXCLUDED.speaking,
            total = EXCLUDED.total,
            note = EXCLUDED.note,
            updated_at = NOW()
          RETURNING *;
        `;

        const result = await execQuery(query, values);
        upserted.push(...(result.rows as any[]).map((r) => this.mapToEntity(r)));
      }

      if (!externalTx) await client.query("COMMIT");
      return upserted;
    } catch (error) {
      if (!externalTx) {
        await client.query("ROLLBACK");
      }
      throw error;
    } finally {
      if (!externalTx) {
        (client as any).release();
      }
    }
  }

  private mapToEntity(row: Record<string, unknown>): SessionScore {
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      studentId: String(row.student_id),
      scoreType: row.score_type as ScoreType,
      listening: (row.listening as number | null) ?? null,
      reading: (row.reading as number | null) ?? null,
      writing: (row.writing as number | null) ?? null,
      speaking: (row.speaking as number | null) ?? null,
      total: (row.total as number | null) ?? null,
      note: (row.note as string | null) ?? null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
