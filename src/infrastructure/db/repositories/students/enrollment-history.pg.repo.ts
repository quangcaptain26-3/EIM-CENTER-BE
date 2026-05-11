import { IEnrollmentHistoryRepo, HistoryEntry } from '../../../../domain/students/repositories/student.repo.port';

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
}
