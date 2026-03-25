import { pool } from "../../pg-pool";
import { Student } from "../../../../domain/students/entities/student.entity";
import { StudentRepoPort } from "../../../../domain/students/repositories/student.repo.port";

/**
 * Implementation của StudentRepoPort sử dụng PostgreSQL
 */
export class StudentPgRepo implements StudentRepoPort {
  async list(params: { search?: string; limit?: number; offset?: number }): Promise<Student[]> {
    // Filter: tìm theo tên (full_name), SĐT (phone, guardian_phone), email — ILIKE case-insensitive
    let query = `
      SELECT s.id, s.full_name AS "fullName", s.dob, s.gender, s.phone, s.email,
             s.guardian_name AS "guardianName", s.guardian_phone AS "guardianPhone", s.address,
             s.created_at AS "createdAt",
             -- Subquery: lấy enrollment ACTIVE hiện tại (lớp đang học) để học vụ biết khi add vào lớp khác
             (SELECT json_build_object('classCode', c.code, 'programName', p.name)
              FROM enrollments e
              LEFT JOIN classes c ON c.id = e.class_id
              LEFT JOIN curriculum_programs p ON p.id = c.program_id
              WHERE e.student_id = s.id AND e.status = 'ACTIVE'
              ORDER BY e.start_date DESC LIMIT 1) AS "currentEnrollment"
      FROM students s`;
    const values: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      query += ` WHERE (s.full_name ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.guardian_phone ILIKE $${paramIndex})`;
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC`;

    if (params.limit !== undefined) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset !== undefined) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
    }

    const { rows } = await pool.query(query, values);
    // Map currentEnrollment: pg trả json object hoặc null
    return rows.map((r: any) => ({
      ...r,
      currentEnrollment: r.currentEnrollment && typeof r.currentEnrollment === 'object'
        ? { classCode: r.currentEnrollment.classCode ?? '', programName: r.currentEnrollment.programName ?? null }
        : null,
    }));
  }

  async count(params: { search?: string }): Promise<number> {
    let query = `SELECT COUNT(*) FROM students`;
    const values: any[] = [];

    if (params.search) {
      query += ` WHERE full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR guardian_phone ILIKE $1`;
      values.push(`%${params.search}%`);
    }

    const { rows } = await pool.query(query, values);
    return parseInt(rows[0].count, 10);
  }

  async create(input: Omit<Student, "id" | "createdAt">): Promise<Student> {
    const query = `
      INSERT INTO students (full_name, dob, gender, phone, email, guardian_name, guardian_phone, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, full_name AS "fullName", dob, gender, phone, email, guardian_name AS "guardianName", guardian_phone AS "guardianPhone", address, created_at AS "createdAt"
    `;
    const values = [
      input.fullName,
      input.dob || null,
      input.gender || null,
      input.phone || null,
      input.email || null,
      input.guardianName || null,
      input.guardianPhone || null,
      input.address || null
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findById(id: string): Promise<Student | null> {
    const query = `
      SELECT id, full_name AS "fullName", dob, gender, phone, email, guardian_name AS "guardianName", guardian_phone AS "guardianPhone", address, created_at AS "createdAt"
      FROM students
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async update(id: string, patch: Partial<Omit<Student, "id" | "createdAt">>): Promise<Student> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const mapping = {
      fullName: "full_name",
      dob: "dob",
      gender: "gender",
      phone: "phone",
      email: "email",
      guardianName: "guardian_name",
      guardianPhone: "guardian_phone",
      address: "address"
    };

    for (const [key, value] of Object.entries(patch)) {
      const dbField = mapping[key as keyof typeof mapping];
      if (dbField) {
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      const current = await this.findById(id);
      if (!current) throw new Error("Không tìm thấy học viên");
      return current;
    }

    values.push(id);
    const query = `
      UPDATE students
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, full_name AS "fullName", dob, gender, phone, email, guardian_name AS "guardianName", guardian_phone AS "guardianPhone", address, created_at AS "createdAt"
    `;

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      throw new Error(`Không tìm thấy học viên với id ${id} để cập nhật`);
    }
    return rows[0];
  }
}
