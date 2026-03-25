import { Pool, type PoolClient } from "pg";
import { SessionFeedback } from "../../../../domain/feedback/entities/session-feedback.entity";
import { FeedbackRepoPort } from "../../../../domain/feedback/repositories/feedback.repo.port";

export class PostgresFeedbackRepository implements FeedbackRepoPort {
  constructor(private readonly pool: Pool) {}

  async listBySession(sessionId: string): Promise<SessionFeedback[]> {
    const query = `
      SELECT * FROM session_feedback
      WHERE session_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await this.pool.query(query, [sessionId]);
    return result.rows.map(this.mapToEntity);
  }

  async listByStudent(studentId: string, limit: number = 20, offset: number = 0): Promise<SessionFeedback[]> {
    const query = `
      SELECT * FROM session_feedback
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await this.pool.query(query, [studentId, limit, offset]);
    return result.rows.map(this.mapToEntity);
  }

  async upsertMany(
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
    options?: { tx?: PoolClient }
  ): Promise<SessionFeedback[]> {
    if (items.length === 0) return [];

    const externalTx = options?.tx;
    const client = externalTx ?? (await this.pool.connect());
    // PoolClient.query phụ thuộc vào `this`, nên luôn gọi qua object (tránh mất context khi truyền hàm).
    const execQuery = (text: string, params?: unknown[]) => (client as any).query(text, params);

    // Chunk để tránh query quá dài + giảm áp lực lên PostgreSQL.
    const BATCH_SIZE = 200;
    try {
      if (!externalTx) await client.query("BEGIN");

      const upserted: SessionFeedback[] = [];

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
            item.teacherId,
            item.attendance ?? null,
            item.homework ?? null,
            item.participation ?? null,
            item.behavior ?? null,
            item.languageUsage ?? null,
            item.commentText ?? null,
          );

          // $base+1 .. $base+9
          const p1 = base + 1;
          tuples.push(
            `($${p1}, $${p1 + 1}, $${p1 + 2}, $${p1 + 3}, $${p1 + 4}, $${p1 + 5}, $${p1 + 6}, $${p1 + 7}, $${p1 + 8}, NOW())`,
          );
        }

        const query = `
          INSERT INTO session_feedback (
            session_id, student_id, teacher_id,
            attendance, homework, participation, behavior, language_usage, comment_text,
            updated_at
          )
          VALUES ${tuples.join(",")}
          ON CONFLICT (session_id, student_id)
          DO UPDATE SET
            teacher_id = EXCLUDED.teacher_id,
            attendance = EXCLUDED.attendance,
            homework = EXCLUDED.homework,
            participation = EXCLUDED.participation,
            behavior = EXCLUDED.behavior,
            language_usage = EXCLUDED.language_usage,
            comment_text = EXCLUDED.comment_text,
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

  async getAttendanceSummaries(
    enrollmentIds: string[]
  ): Promise<Map<string, { absentCount: number; totalSessions: number }>> {
    if (enrollmentIds.length === 0) return new Map();

    const query = `
      SELECT
        e.id AS enrollment_id,
        COUNT(DISTINCT s.id)::INT AS total_sessions,
        COUNT(*) FILTER (WHERE sf.attendance = 'ABSENT')::INT AS absent_count
      FROM enrollments e
      JOIN sessions s ON s.class_id = e.class_id
        AND s.session_date >= e.start_date
        AND (e.end_date IS NULL OR s.session_date <= e.end_date)
      LEFT JOIN session_feedback sf ON sf.session_id = s.id AND sf.student_id = e.student_id
      WHERE e.id = ANY($1::uuid[])
        AND e.class_id IS NOT NULL
      GROUP BY e.id
    `;
    const { rows } = await this.pool.query(query, [enrollmentIds]);
    const map = new Map<string, { absentCount: number; totalSessions: number }>();
    for (const r of rows) {
      map.set(String(r.enrollment_id), {
        absentCount: Number(r.absent_count) || 0,
        totalSessions: Number(r.total_sessions) || 0,
      });
    }
    return map;
  }

  private mapToEntity(row: Record<string, unknown>): SessionFeedback {
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      studentId: String(row.student_id),
      attendance: (row.attendance as string | null) ?? null,
      homework: (row.homework as string | null) ?? null,
      participation: (row.participation as string | null) ?? null,
      behavior: (row.behavior as string | null) ?? null,
      languageUsage: (row.language_usage as string | null) ?? null,
      commentText: (row.comment_text as string | null) ?? null,
      teacherId: String(row.teacher_id),
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
