import { IClassStaffRepo } from '../../../../domain/classes/repositories/class.repo.port';

export class ClassStaffPgRepo implements IClassStaffRepo {
  constructor(private readonly db: any) {}

  async findActiveByClass(classId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT * FROM class_staff WHERE class_id = $1 AND effective_to_session IS NULL`,
      [classId]
    );
    return result.rows;
  }

  async create(data: {
    classId: string;
    teacherId: string;
    effectiveFromSession?: number;
    assignedBy: string;
  }): Promise<any> {
    const from = data.effectiveFromSession ?? 1;
    const result = await this.db.query(
      `INSERT INTO class_staff (class_id, teacher_id, effective_from_session, assigned_by, assigned_at)
       VALUES ($1, $2, $3, $4, now()) RETURNING *`,
      [data.classId, data.teacherId, from, data.assignedBy],
    );
    return result.rows[0];
  }

  async closeRecord(id: string, toSession: number): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE class_staff SET effective_to_session = $2 WHERE id = $1`,
      [id, toSession],
    );
    return result.rowCount > 0;
  }
}
