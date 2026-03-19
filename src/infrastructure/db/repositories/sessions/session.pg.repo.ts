import { Pool } from "pg";
import { Session } from "../../../../domain/sessions/entities/session.entity";
import { ISessionRepository, CreateSessionInput, UpdateSessionInput } from "../../../../domain/sessions/repositories/session.repo.port";

export class PostgresSessionRepository implements ISessionRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Tạo nhiều buổi học an toàn với transaction
   */
  async createMany(inputs: CreateSessionInput[]): Promise<Session[]> {
    if (inputs.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      
      const createdSessions: Session[] = [];
      
      for (const input of inputs) {
        const query = `
          INSERT INTO sessions (class_id, session_date, unit_no, lesson_no, lesson_pattern, session_type, main_teacher_id, cover_teacher_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        const values = [
          input.classId,
          input.sessionDate,
          input.unitNo,
          input.lessonNo,
          input.lessonPattern ?? null,
          input.sessionType,
          input.mainTeacherId || null,
          input.coverTeacherId || null,
        ];
        
        const result = await client.query(query, values);
        createdSessions.push(this.mapToEntity(result.rows[0]));
      }

      await client.query("COMMIT");
      return createdSessions;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lấy danh sách buổi học của một lớp, sắp xếp theo session_date tăng dần
   */
  async listByClass(classId: string): Promise<Session[]> {
    const query = `
      SELECT * FROM sessions
      WHERE class_id = $1
      ORDER BY session_date ASC;
    `;
    const result = await this.pool.query(query, [classId]);
    return result.rows.map(this.mapToEntity);
  }

  /**
   * Lấy danh sách buổi học của một lớp theo khoảng ngày (lọc ở DB).
   * Dùng cho các luồng export để giảm fetch dư và tránh lọc in-memory quá lớn.
   */
  async listByClassInRange(
    classId: string,
    params?: { fromDate?: Date; toDate?: Date; limit?: number },
  ): Promise<Session[]> {
    const conditions: string[] = ["class_id = $1"];
    const values: unknown[] = [classId];
    let paramIndex = 2;

    if (params?.fromDate) {
      conditions.push(`session_date >= $${paramIndex++}`);
      values.push(params.fromDate);
    }

    if (params?.toDate) {
      conditions.push(`session_date <= $${paramIndex++}`);
      values.push(params.toDate);
    }

    let limitClause = "";
    if (params?.limit && params.limit > 0) {
      limitClause = `LIMIT $${paramIndex++}`;
      values.push(params.limit);
    }

    const query = `
      SELECT * FROM sessions
      WHERE ${conditions.join(" AND ")}
      ORDER BY session_date ASC
      ${limitClause};
    `;

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapToEntity);
  }

  /**
   * Lấy danh sách buổi học của một giáo viên (dạy chính hoặc dạy thay)
   */
  async listByTeacher(teacherId: string): Promise<Session[]> {
    const query = `
      SELECT * FROM sessions
      WHERE main_teacher_id = $1 OR cover_teacher_id = $1
      ORDER BY session_date DESC;
    `;
    const result = await this.pool.query(query, [teacherId]);
    return result.rows.map(this.mapToEntity);
  }

  /**
   * Tìm buổi học theo ID
   */
  async findById(sessionId: string): Promise<Session | null> {
    const query = `
      SELECT * FROM sessions
      WHERE id = $1;
    `;
    const result = await this.pool.query(query, [sessionId]);
    if (result.rows.length === 0) return null;
    return this.mapToEntity(result.rows[0]);
  }

  /**
   * Cập nhật buổi học
   */
  async update(sessionId: string, patch: UpdateSessionInput): Promise<Session> {
    // Nếu không truyền tham số update nào, ném lỗi hoặc trả về nguyên trạng
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (patch.unitNo !== undefined) {
      fields.push(`unit_no = $${paramIndex++}`);
      values.push(patch.unitNo);
    }
    if (patch.lessonNo !== undefined) {
      fields.push(`lesson_no = $${paramIndex++}`);
      values.push(patch.lessonNo);
    }
    if (patch.sessionType !== undefined) {
      fields.push(`session_type = $${paramIndex++}`);
      values.push(patch.sessionType);
    }
    if (patch.lessonPattern !== undefined) {
      fields.push(`lesson_pattern = $${paramIndex++}`);
      values.push(patch.lessonPattern);
    }
    if (patch.mainTeacherId !== undefined) {
      fields.push(`main_teacher_id = $${paramIndex++}`);
      values.push(patch.mainTeacherId);
    }
    if (patch.coverTeacherId !== undefined) {
      fields.push(`cover_teacher_id = $${paramIndex++}`);
      values.push(patch.coverTeacherId);
    }

    if (fields.length === 0) {
      const session = await this.findById(sessionId);
      if (!session) throw new Error("Session not found");
      return session;
    }

    values.push(sessionId);
    const query = `
      UPDATE sessions
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) throw new Error("Session not found");
    return this.mapToEntity(result.rows[0]);
  }

  /**
   * Đổi lịch học (Từ ngày cũ sang ngày mới)
   */
  async reschedule(sessionId: string, toDate: Date, note?: string): Promise<Session> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Lấy trạng thái hiện tại của session
      const fetchQuery = `SELECT * FROM sessions WHERE id = $1 FOR UPDATE`;
      const fetchResult = await client.query(fetchQuery, [sessionId]);
      
      if (fetchResult.rows.length === 0) {
        throw new Error("Session not found");
      }
      
      const sessionRow = fetchResult.rows[0];
      const fromDate = sessionRow.session_date;

      // Update session hiện tại với ngày mới
      const updateQuery = `
        UPDATE sessions
        SET session_date = $1
        WHERE id = $2
        RETURNING *;
      `;
      const updateResult = await client.query(updateQuery, [toDate, sessionId]);
      const updatedSession = updateResult.rows[0];

      // Insert dữ liệu vào session_reschedules
      const historyQuery = `
        INSERT INTO session_reschedules (session_id, from_date, to_date, note)
        VALUES ($1, $2, $3, $4);
      `;
      await client.query(historyQuery, [sessionId, fromDate, toDate, note || null]);

      await client.query("COMMIT");
      return this.mapToEntity(updatedSession);
    } catch (error: any) {
      await client.query("ROLLBACK");
      // Nếu vi phạm UNIQUE(class_id, session_date)
      if (error.code === '23505' && error.constraint === 'sessions_class_id_session_date_key') {
         throw new Error("CONFLICT_SESSION_DATE"); 
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Kiểm tra ngày truyền vào của lớp đó đã có buổi học nào chưa
   */
  async existsByClassAndDate(classId: string, date: Date): Promise<boolean> {
    const query = `
      SELECT 1 FROM sessions
      WHERE class_id = $1 AND session_date = $2
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [classId, date]);
    return result.rows.length > 0;
  }

  /**
   * Ánh xạ từ DB Row sang Session Entity
   */
  private mapToEntity(row: any): Session {
    return {
      id: row.id,
      classId: row.class_id,
      sessionDate: row.session_date,
      unitNo: row.unit_no,
      lessonNo: row.lesson_no,
      lessonPattern: row.lesson_pattern ?? null,
      sessionType: row.session_type,
      mainTeacherId: row.main_teacher_id,
      coverTeacherId: row.cover_teacher_id,
      createdAt: row.created_at,
    };
  }
}
