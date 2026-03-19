import { Pool } from "pg";
import {
  RosterRepoPort,
  RosterStudent,
} from "../../../../domain/classes/repositories/roster.repo.port";
import { pool } from "../../pg-pool";

export class RosterPgRepo implements RosterRepoPort {

  async listRoster(classId: string): Promise<RosterStudent[]> {
    const query = `
      SELECT 
        e.student_id, 
        s.full_name, 
        e.status
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.class_id = $1 AND e.status = 'ACTIVE'
      ORDER BY s.full_name ASC
    `;
    
    const res = await pool.query(query, [classId]);
    
    return res.rows.map(row => ({
      studentId: row.student_id,
      fullName: row.full_name,
      status: row.status
    }));
  }

  async listRosterAtDate(classId: string, sessionDate: Date): Promise<RosterStudent[]> {
    const query = `
      SELECT 
        e.student_id, 
        s.full_name, 
        e.status
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE 
        e.class_id = $1
        AND e.start_date <= $2
        AND (e.end_date IS NULL OR e.end_date >= $2)
        AND e.status IN ('ACTIVE', 'PAUSED')
      ORDER BY s.full_name ASC
    `;

    const res = await pool.query(query, [classId, sessionDate]);

    return res.rows.map(row => ({
      studentId: row.student_id,
      fullName: row.full_name,
      status: row.status
    }));
  }
}
