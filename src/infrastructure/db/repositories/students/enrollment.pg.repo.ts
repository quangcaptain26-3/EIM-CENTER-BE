import { pool } from "../../pg-pool";
import { Enrollment, EnrollmentStatus } from "../../../../domain/students/entities/enrollment.entity";
import { EnrollmentRepoPort } from "../../../../domain/students/repositories/enrollment.repo.port";

/**
 * Implementation của EnrollmentRepoPort sử dụng PostgreSQL
 */
export class EnrollmentPgRepo implements EnrollmentRepoPort {
  private mapRowToEntity(row: unknown): Enrollment {
    const r = row as {
      id: string;
      student_id: string;
      class_id: string | null;
      status: EnrollmentStatus;
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
    };
    return {
      id: r.id,
      studentId: r.student_id,
      classId: r.class_id,
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date ?? undefined,
      createdAt: r.created_at,
    };
  }

  async create(
    input: Omit<Enrollment, "id" | "createdAt">,
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } },
  ): Promise<Enrollment> {
    const query = `
      INSERT INTO enrollments (student_id, class_id, status, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      input.studentId,
      input.classId ?? null,
      input.status,
      input.startDate,
      input.endDate || null
    ];
    const client = options?.tx ?? pool;
    const { rows } = await client.query(query, values);
    return this.mapRowToEntity(rows[0]);
  }

  async findById(
    id: string,
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } },
  ): Promise<Enrollment | null> {
    const query = `SELECT * FROM enrollments WHERE id = $1`;
    const client = options?.tx ?? pool;
    const { rows } = await client.query(query, [id]);
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async listByStudent(studentId: string): Promise<Enrollment[]> {
    const query = `SELECT * FROM enrollments WHERE student_id = $1 ORDER BY start_date DESC`;
    const { rows } = await pool.query(query, [studentId]);
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async updateStatus(enrollmentId: string, toStatus: EnrollmentStatus, note?: string): Promise<Enrollment> {
    const query = `
      UPDATE enrollments
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [toStatus, enrollmentId]);
    if (rows.length === 0) {
      throw new Error("Không tìm thấy thông tin ghi danh để cập nhật trạng thái");
    }
    return this.mapRowToEntity(rows[0]);
  }

  async updateClassId(
    enrollmentId: string,
    classId: string | null,
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } },
  ): Promise<Enrollment> {
    const query = `
      UPDATE enrollments
      SET class_id = $1
      WHERE id = $2
      RETURNING *
    `;
    const client = options?.tx ?? pool;
    const { rows } = await client.query(query, [classId, enrollmentId]);
    if (rows.length === 0) {
      throw new Error("Không tìm thấy thông tin ghi danh để cập nhật lớp học");
    }
    return this.mapRowToEntity(rows[0]);
  }

  async endEnrollment(enrollmentId: string, endDate: Date, note?: string): Promise<Enrollment> {
    const query = `
      UPDATE enrollments
      SET end_date = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [endDate, enrollmentId]);
    if (rows.length === 0) {
      throw new Error("Không tìm thấy thông tin ghi danh để kết thúc");
    }
    return this.mapRowToEntity(rows[0]);
  }

  async createHistory(
    enrollmentId: string,
    fromStatus: EnrollmentStatus,
    toStatus: EnrollmentStatus,
    note?: string,
    meta?: { changedBy?: string | null; fromClassId?: string | null; toClassId?: string | null },
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } },
  ): Promise<void> {
    const query = `
      INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const values = [
      enrollmentId,
      fromStatus,
      toStatus,
      note || null,
      meta?.changedBy ?? null,
      meta?.fromClassId ?? null,
      meta?.toClassId ?? null,
    ];
    const client = options?.tx ?? pool;
    await client.query(query, values);
  }
}
