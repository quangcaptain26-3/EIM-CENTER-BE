import {
  ClassRosterRow,
  EnrollmentWithProgramClass,
  IEnrollmentRepo,
} from '../../../../domain/students/repositories/student.repo.port';
import { EnrollmentEntity, EnrollmentStatus } from '../../../../domain/students/entities/enrollment.entity';

export class EnrollmentPgRepo implements IEnrollmentRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): EnrollmentEntity {
    return new EnrollmentEntity(
      row.id,
      row.student_id,
      row.program_id,
      row.class_id,
      row.status as EnrollmentStatus,
      parseFloat(row.tuition_fee) || 0,
      row.sessions_attended || 0,
      row.sessions_absent || 0,
      row.class_transfer_count || 0,
      row.makeup_blocked || false,
      row.enrolled_at,
      row.created_at,
      row.updated_at,
      row.paid_at,
      row.created_by
    );
  }

  async findById(id: string): Promise<EnrollmentEntity | null> {
    const result = await this.db.query(`SELECT * FROM enrollments WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return this.mapToEntity(result.rows[0]);
  }

  async findByStudent(studentId: string): Promise<EnrollmentEntity[]> {
    const result = await this.db.query(`SELECT * FROM enrollments WHERE student_id = $1 ORDER BY created_at DESC`, [studentId]);
    return result.rows.map((row: any) => this.mapToEntity(row));
  }

  async findByStudentWithProgramClass(studentId: string): Promise<EnrollmentWithProgramClass[]> {
    const result = await this.db.query(
      `SELECT e.*, p.code AS program_code, p.name AS program_name, c.class_code
       FROM enrollments e
       LEFT JOIN programs p ON p.id = e.program_id
       LEFT JOIN classes c ON c.id = e.class_id
       WHERE e.student_id = $1
       ORDER BY e.created_at DESC`,
      [studentId],
    );
    return result.rows.map((row: any) => ({
      enrollment: this.mapToEntity(row),
      programCode: row.program_code ?? null,
      programName: row.program_name ?? null,
      classCode: row.class_code ?? null,
    }));
  }

  async findActiveByStudent(studentId: string): Promise<EnrollmentEntity | null> {
    // The requirement explicitly mentions: "enrollment findActiveByStudent: LEFT JOIN kiểm tra status IN ('trial','active','paused')."
    // I will query the enrollment using the IN clause.
    const result = await this.db.query(
      `SELECT e.* FROM enrollments e
       WHERE e.student_id = $1 AND e.status IN ('trial', 'active', 'paused')
       LIMIT 1`,
      [studentId]
    );
    if (!result.rows[0]) return null;
    return this.mapToEntity(result.rows[0]);
  }

  async findByClass(classId: string): Promise<EnrollmentEntity[]> {
    const result = await this.db.query(`SELECT * FROM enrollments WHERE class_id = $1 ORDER BY created_at DESC`, [classId]);
    return result.rows.map((row: any) => this.mapToEntity(row));
  }

  async findRosterByClass(classId: string): Promise<ClassRosterRow[]> {
    const result = await this.db.query(
      `SELECT e.id AS enrollment_id,
              e.student_id,
              e.status,
              s.full_name AS student_name,
              s.student_code,
              COALESCE((
                SELECT COUNT(*)::int FROM attendance a
                WHERE a.enrollment_id = e.id AND a.status = 'absent_unexcused'
              ), 0) AS unexcused_absence_count
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.class_id = $1 AND e.status IN ('trial', 'active')
       ORDER BY s.full_name ASC`,
      [classId],
    );
    return result.rows.map((row: any) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentCode: row.student_code ?? null,
      status: row.status,
      unexcusedAbsenceCount: Number(row.unexcused_absence_count ?? 0),
    }));
  }

  async create(data: Partial<EnrollmentEntity>): Promise<EnrollmentEntity> {
    const fields = ['student_id', 'program_id', 'class_id', 'status', 'tuition_fee', 'sessions_attended', 'sessions_absent', 'class_transfer_count', 'makeup_blocked', 'enrolled_at', 'paid_at', 'created_by'];
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

    const query = `INSERT INTO enrollments (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await this.db.query(query, vals);
    return this.mapToEntity(result.rows[0]);
  }

  async updateStatus(id: string, status: EnrollmentStatus, extraData?: any): Promise<EnrollmentEntity> {
    const sets = [`status = $1`, `updated_at = NOW()`];
    const vals: any[] = [status, id];
    let i = 3;

    if (extraData?.sessionsAttended !== undefined) {
      sets.push(`sessions_attended = $${i++}`);
      vals.push(extraData.sessionsAttended);
    }
    if (extraData?.sessionsAbsent !== undefined) {
      sets.push(`sessions_absent = $${i++}`);
      vals.push(extraData.sessionsAbsent);
    }
    if (extraData?.classTransferCount !== undefined) {
      sets.push(`class_transfer_count = $${i++}`);
      vals.push(extraData.classTransferCount);
    }
    if (extraData?.makeupBlocked !== undefined) {
      sets.push(`makeup_blocked = $${i++}`);
      vals.push(extraData.makeupBlocked);
    }
    if (extraData?.paidAt !== undefined) {
      sets.push(`paid_at = $${i++}`);
      vals.push(extraData.paidAt);
    }
    if (extraData?.classId !== undefined) {
      sets.push(`class_id = $${i++}`);
      vals.push(extraData.classId);
    }

    // $2 was id, wait, vals: [status, id] -> indices 1 and 2. Oh, I should put id at the end.
    // Let's re-arrange vals.
    const queryVals: any[] = [status];
    let paramIndex = 2;
    const finalSets = [`status = $1`, `updated_at = NOW()`];

    if (extraData?.sessionsAttended !== undefined) {
      finalSets.push(`sessions_attended = $${paramIndex++}`);
      queryVals.push(extraData.sessionsAttended);
    }
    if (extraData?.sessionsAbsent !== undefined) {
      finalSets.push(`sessions_absent = $${paramIndex++}`);
      queryVals.push(extraData.sessionsAbsent);
    }
    if (extraData?.classTransferCount !== undefined) {
      finalSets.push(`class_transfer_count = $${paramIndex++}`);
      queryVals.push(extraData.classTransferCount);
    }
    if (extraData?.makeupBlocked !== undefined) {
      finalSets.push(`makeup_blocked = $${paramIndex++}`);
      queryVals.push(extraData.makeupBlocked);
    }
    if (extraData?.paidAt !== undefined) {
      finalSets.push(`paid_at = $${paramIndex++}`);
      queryVals.push(extraData.paidAt);
    }
    if (extraData?.classId !== undefined) {
      finalSets.push(`class_id = $${paramIndex++}`);
      queryVals.push(extraData.classId);
    }

    queryVals.push(id);
    const query = `UPDATE enrollments SET ${finalSets.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await this.db.query(query, queryVals);
    if (!result.rows[0]) throw new Error('Enrollment not found');
    return this.mapToEntity(result.rows[0]);
  }
}
