import {
  IEnrollmentHistoryRepo,
  HistoryEntry,
  StudentEnrollmentHistoryRow,
} from '../../../../domain/students/repositories/student.repo.port';

export class EnrollmentHistoryPgRepo implements IEnrollmentHistoryRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): HistoryEntry {
    return {
      id: row.id,
      enrollmentId: row.enrollment_id,
      action: row.action,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      fromClassId: row.from_class_id,
      toClassId: row.to_class_id,
      fromProgramId: row.from_program_id,
      toProgramId: row.to_program_id,
      sessionsAtAction: row.sessions_at_action,
      changedBy: row.changed_by,
      note: row.note,
      actionDate: row.action_date,
    };
  }

  async create(data: Partial<HistoryEntry>): Promise<void> {
    const fields = [
      'enrollment_id',
      'action',
      'from_status',
      'to_status',
      'from_class_id',
      'to_class_id',
      'from_program_id',
      'to_program_id',
      'sessions_at_action',
      'changed_by',
      'note',
    ];
    const cols: string[] = [];
    const vals: unknown[] = [];
    const placeholders: string[] = [];
    let i = 1;

    for (const dKey in data) {
      const dbKey = dKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (fields.includes(dbKey) && (data as any)[dKey] !== undefined) {
        cols.push(dbKey);
        vals.push((data as any)[dKey]);
        placeholders.push(`$${i++}`);
      }
    }

    const query = `INSERT INTO enrollment_history (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await this.db.query(query, vals);
  }

  async findByEnrollment(enrollmentId: string): Promise<HistoryEntry[]> {
    const result = await this.db.query(
      `SELECT * FROM enrollment_history WHERE enrollment_id = $1 ORDER BY action_date DESC`,
      [enrollmentId],
    );
    return result.rows.map((row: any) => this.mapToEntity(row));
  }

  async findByStudentId(studentId: string): Promise<StudentEnrollmentHistoryRow[]> {
    const result = await this.db.query(
      `SELECT eh.*,
              fp.code AS from_program_code, fp.name AS from_program_name,
              tp.code AS to_program_code, tp.name AS to_program_name,
              fc.class_code AS from_class_code, tc.class_code AS to_class_code,
              u.full_name AS changed_by_name
       FROM enrollment_history eh
       JOIN enrollments e ON e.id = eh.enrollment_id
       LEFT JOIN programs fp ON fp.id = eh.from_program_id
       LEFT JOIN programs tp ON tp.id = eh.to_program_id
       LEFT JOIN classes fc ON fc.id = eh.from_class_id
       LEFT JOIN classes tc ON tc.id = eh.to_class_id
       LEFT JOIN users u ON u.id = eh.changed_by
       WHERE e.student_id = $1
       ORDER BY eh.action_date DESC`,
      [studentId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      enrollmentId: String(row.enrollment_id),
      action: String(row.action),
      fromStatus: row.from_status != null ? String(row.from_status) : null,
      toStatus: row.to_status != null ? String(row.to_status) : null,
      fromClassId: row.from_class_id != null ? String(row.from_class_id) : null,
      toClassId: row.to_class_id != null ? String(row.to_class_id) : null,
      fromProgramId: row.from_program_id != null ? String(row.from_program_id) : null,
      toProgramId: row.to_program_id != null ? String(row.to_program_id) : null,
      fromProgramCode: row.from_program_code != null ? String(row.from_program_code) : null,
      fromProgramName: row.from_program_name != null ? String(row.from_program_name) : null,
      toProgramCode: row.to_program_code != null ? String(row.to_program_code) : null,
      toProgramName: row.to_program_name != null ? String(row.to_program_name) : null,
      fromClassCode: row.from_class_code != null ? String(row.from_class_code) : null,
      toClassCode: row.to_class_code != null ? String(row.to_class_code) : null,
      sessionsAtAction: row.sessions_at_action != null ? Number(row.sessions_at_action) : null,
      changedBy: row.changed_by != null ? String(row.changed_by) : null,
      changedByName: row.changed_by_name != null ? String(row.changed_by_name) : null,
      note: row.note != null ? String(row.note) : null,
      actionDate: row.action_date != null ? new Date(String(row.action_date)) : undefined,
    }));
  }
}
