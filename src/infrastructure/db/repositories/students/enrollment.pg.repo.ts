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
      class_code?: string | null;
      program_id?: string | null;
      source_enrollment_id?: string | null;
      status: EnrollmentStatus;
      start_date: Date;
      end_date: Date | null;
      current_unit_no?: number | null;
      current_lesson_no?: number | null;
      created_at: Date;
    };
    return {
      id: r.id,
      studentId: r.student_id,
      sourceEnrollmentId: r.source_enrollment_id ?? null,
      classId: r.class_id,
      classCode: r.class_code ?? null,
      programId: r.program_id ?? null,
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date ?? undefined,
      currentUnitNo: r.current_unit_no ?? null,
      currentLessonNo: r.current_lesson_no ?? null,
      createdAt: r.created_at,
    };
  }

  async create(
    input: Omit<Enrollment, "id" | "createdAt">,
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } },
  ): Promise<Enrollment> {
    const query = `
      INSERT INTO enrollments (student_id, class_id, status, start_date, end_date, current_unit_no, current_lesson_no)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      input.studentId,
      input.classId ?? null,
      input.status,
      input.startDate,
      input.endDate || null,
      input.currentUnitNo ?? null,
      input.currentLessonNo ?? null,
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
    const query = `
      SELECT e.*, c.code AS class_code, c.program_id
      FROM enrollments e
      LEFT JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = $1
      ORDER BY e.start_date DESC
    `;
    const { rows } = await pool.query(query, [studentId]);
    return rows.map((row) => this.mapRowToEntity(row));
  }

  async listByClassId(
    classId: string,
    statuses?: EnrollmentStatus[],
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<unknown> } },
  ): Promise<Enrollment[]> {
    const client = options?.tx ?? pool;
    const statusFilter =
      statuses && statuses.length > 0
        ? `AND status = ANY($2::text[])`
        : "";
    const query = `
      SELECT * FROM enrollments
      WHERE class_id = $1 ${statusFilter}
      ORDER BY start_date ASC
    `;
    const params = statuses?.length ? [classId, statuses] : [classId];
    const result = await client.query(query, params) as { rows: unknown[] };
    return result.rows.map((row: unknown) => this.mapRowToEntity(row));
  }

  async updateStatus(
    enrollmentId: string,
    toStatus: EnrollmentStatus,
    note?: string,
    endDate?: Date,
  ): Promise<Enrollment> {
    // Trạng thái kết thúc: GRADUATED, DROPPED, TRANSFERRED — cần set end_date nếu chưa có
    const terminalStatuses: EnrollmentStatus[] = ["GRADUATED", "DROPPED", "TRANSFERRED"];
    const shouldSetEndDate = terminalStatuses.includes(toStatus);
    const effectiveEndDate = shouldSetEndDate ? (endDate ?? new Date()) : null;

    const query = effectiveEndDate
      ? `
      UPDATE enrollments
      SET status = $1, end_date = COALESCE(end_date, $2::date)
      WHERE id = $3
      RETURNING *
    `
      : `
      UPDATE enrollments
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const params = effectiveEndDate ? [toStatus, effectiveEndDate, enrollmentId] : [toStatus, enrollmentId];
    const { rows } = await pool.query(query, params);
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
    meta?: { changedBy?: string | null; fromClassId?: string | null; toClassId?: string | null; transferUnitNo?: number | null; transferLessonNo?: number | null },
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } },
  ): Promise<void> {
    const query = `
      INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id, transfer_unit_no, transfer_lesson_no)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      enrollmentId,
      fromStatus,
      toStatus,
      note || null,
      meta?.changedBy ?? null,
      meta?.fromClassId ?? null,
      meta?.toClassId ?? null,
      meta?.transferUnitNo ?? null,
      meta?.transferLessonNo ?? null,
    ];
    const client = options?.tx ?? pool;
    await client.query(query, values);
  }
}
