import { IStudentRepo, PagedResult } from '../../../../domain/students/repositories/student.repo.port';
import { StudentEntity } from '../../../../domain/students/entities/student.entity';

export class StudentPgRepo implements IStudentRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): StudentEntity {
    return new StudentEntity(
      row.id,
      row.student_code,
      row.full_name,
      row.is_active,
      row.created_at,
      row.updated_at,
      row.dob,
      row.gender,
      row.address,
      row.school_name,
      row.parent_name,
      row.parent_phone,
      row.parent_phone2,
      row.parent_zalo,
      row.current_level,
      row.test_result,
      row.created_by,
      row.display_class_code != null ? String(row.display_class_code) : undefined,
      row.display_program_name != null ? String(row.display_program_name) : undefined,
      row.display_enrollment_status != null ? String(row.display_enrollment_status) : undefined,
    );
  }

  async findById(id: string): Promise<StudentEntity | null> {
    const result = await this.db.query(`SELECT * FROM students WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!result.rows[0]) return null;
    return this.mapToEntity(result.rows[0]);
  }

  async findByCode(code: string): Promise<StudentEntity | null> {
    const result = await this.db.query(`SELECT * FROM students WHERE student_code = $1 AND deleted_at IS NULL`, [code]);
    if (!result.rows[0]) return null;
    return this.mapToEntity(result.rows[0]);
  }

  async findAll(params: {
    search?: string;
    programCode?: string;
    programId?: string;
    level?: string;
    enrollmentStatus?: string;
    classId?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }): Promise<PagedResult<StudentEntity>> {
    const conditions: string[] = ['s.deleted_at IS NULL'];
    const baseValues: unknown[] = [];
    let pi = 1;

    if (params.search) {
      conditions.push(
        `(s.full_name ILIKE $${pi} OR s.parent_phone ILIKE $${pi} OR s.parent_phone2 ILIKE $${pi} OR s.student_code ILIKE $${pi})`,
      );
      baseValues.push(`%${params.search}%`);
      pi++;
    }

    if (params.isActive !== undefined) {
      conditions.push(`s.is_active = $${pi}`);
      baseValues.push(params.isActive);
      pi++;
    }

    const enrollMatch: string[] = [];
    if (params.classId) {
      enrollMatch.push(`e.class_id = $${pi}`);
      baseValues.push(params.classId);
      pi++;
    }
    if (params.programId) {
      enrollMatch.push(`e.program_id = $${pi}::uuid`);
      baseValues.push(params.programId);
      pi++;
    }
    if (params.programCode) {
      enrollMatch.push(`UPPER(p.code::text) = UPPER($${pi}::text)`);
      baseValues.push(String(params.programCode).trim());
      pi++;
    }
    if (params.level) {
      const code = params.level.trim().toUpperCase().replace(/[\s-]+/g, '_');
      enrollMatch.push(`UPPER(p.code::text) = $${pi}::text`);
      baseValues.push(code);
      pi++;
    }
    if (params.enrollmentStatus) {
      enrollMatch.push(`e.status = $${pi}`);
      baseValues.push(params.enrollmentStatus);
      pi++;
    }

    if (enrollMatch.length > 0) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM enrollments e
          INNER JOIN programs p ON p.id = e.program_id
          WHERE e.student_id = s.id AND ${enrollMatch.join(' AND ')}
        )`,
      );
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const preferProgramCode =
      (params.level?.trim()
        ? params.level.trim().toUpperCase().replace(/[\s-]+/g, '_')
        : null) ??
      (params.programCode?.trim() ? String(params.programCode).trim().toUpperCase() : null);

    const lateralClass = params.classId ?? null;
    const lateralProgCode = preferProgramCode;
    const lateralProgId = params.programId ?? null;
    const lateralEnrollStatus = params.enrollmentStatus ?? null;

    const latClass = pi;
    const latProgCode = pi + 1;
    const latProgId = pi + 2;
    const latEnrollSt = pi + 3;
    const limitParamIndex = pi + 4;
    const offsetParamIndex = pi + 5;

    const countQuery = `SELECT COUNT(*)::int AS total FROM students s ${whereClause}`;
    const countResult = await this.db.query(countQuery, baseValues);
    const total = Number(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        s.*,
        d.class_code AS display_class_code,
        d.program_name AS display_program_name,
        d.enrollment_status AS display_enrollment_status
      FROM students s
      LEFT JOIN LATERAL (
        SELECT
          e.status AS enrollment_status,
          c.class_code,
          p.name AS program_name
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        JOIN programs p ON p.id = e.program_id
        WHERE e.student_id = s.id
        ORDER BY
          CASE
            WHEN $${latClass}::uuid IS NOT NULL AND e.class_id = $${latClass}::uuid THEN 0
            ELSE 1
          END,
          CASE
            WHEN $${latProgCode}::text IS NOT NULL AND UPPER(p.code::text) = $${latProgCode}::text THEN 0
            ELSE 1
          END,
          CASE
            WHEN $${latProgId}::uuid IS NOT NULL AND e.program_id = $${latProgId}::uuid THEN 0
            ELSE 1
          END,
          CASE
            WHEN $${latEnrollSt}::text IS NOT NULL AND e.status::text = $${latEnrollSt}::text THEN 0
            ELSE 1
          END,
          CASE e.status
            WHEN 'active' THEN 0
            WHEN 'trial' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'paused' THEN 3
            WHEN 'completed' THEN 4
            WHEN 'transferred' THEN 5
            WHEN 'dropped' THEN 6
            ELSE 7
          END,
          e.enrolled_at DESC NULLS LAST
        LIMIT 1
      ) d ON true
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const dataValues = [
      ...baseValues,
      lateralClass,
      lateralProgCode,
      lateralProgId,
      lateralEnrollStatus,
      params.limit,
      (params.page - 1) * params.limit,
    ];

    const result = await this.db.query(dataQuery, dataValues);
    const data = result.rows.map((row: any) => this.mapToEntity(row));

    return {
      data,
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async create(data: Partial<StudentEntity>): Promise<StudentEntity> {
    const fields = ['student_code', 'full_name', 'is_active', 'dob', 'gender', 'address', 'school_name', 'parent_name', 'parent_phone', 'parent_phone2', 'parent_zalo', 'current_level', 'test_result', 'created_by'];
    const cols = [];
    const vals = [];
    const placeholders = [];
    let i = 1;

    for (const dKey in data) {
      const dbKey = dKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (fields.includes(dbKey) && (data as any)[dKey] !== undefined) {
        cols.push(dbKey);
        vals.push((data as any)[dKey]);
        placeholders.push(`$${i++}`);
      }
    }

    const query = `INSERT INTO students (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await this.db.query(query, vals);
    return this.mapToEntity(result.rows[0]);
  }

  async update(id: string, data: Partial<StudentEntity>): Promise<StudentEntity> {
    const fields = ['student_code', 'full_name', 'is_active', 'dob', 'gender', 'address', 'school_name', 'parent_name', 'parent_phone', 'parent_phone2', 'parent_zalo', 'current_level', 'test_result'];
    const sets = [];
    const vals = [];
    let i = 1;

    for (const dKey in data) {
      const dbKey = dKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (fields.includes(dbKey) && (data as any)[dKey] !== undefined) {
        sets.push(`${dbKey} = $${i++}`);
        vals.push((data as any)[dKey]);
      }
    }

    if (sets.length === 0) {
      const current = await this.findById(id);
      if (!current) throw new Error('Student not found');
      return current;
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);
    const query = `UPDATE students SET ${sets.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`;
    
    const result = await this.db.query(query, vals);
    if (!result.rows[0]) throw new Error('Student not found');
    return this.mapToEntity(result.rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.query(`UPDATE students SET deleted_at = NOW() WHERE id = $1`, [id]);
  }
}
