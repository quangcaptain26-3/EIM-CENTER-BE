import { Pool } from "pg";
import {
  ClassStaff,
  StaffType,
} from "../../../../domain/classes/entities/class-staff.entity";
import { ClassStaffRepoPort } from "../../../../domain/classes/repositories/class-staff.repo.port";
import { pool } from "../../pg-pool";

export class ClassStaffPgRepo implements ClassStaffRepoPort {

  async assignStaff(
    classId: string,
    userId: string,
    type: StaffType
  ): Promise<ClassStaff> {
    const query = `
      WITH upserted AS (
        INSERT INTO class_staff (class_id, user_id, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (class_id, user_id, type)
        DO UPDATE SET assigned_at = NOW()
        RETURNING id, class_id, user_id, type, assigned_at
      )
      SELECT 
        u.id,
        u.class_id,
        u.user_id,
        u.type,
        u.assigned_at,
        au.full_name AS user_full_name
      FROM upserted u
      LEFT JOIN auth_users au ON au.id = u.user_id
    `;
    const res = await pool.query(query, [classId, userId, type]);
    return this.mapStaffRowToEntity(res.rows[0]);
  }

  async listStaff(classId: string): Promise<ClassStaff[]> {
    const query = `
      SELECT 
        cs.id, 
        cs.class_id, 
        cs.user_id, 
        cs.type, 
        cs.assigned_at,
        au.full_name AS user_full_name
      FROM class_staff cs
      LEFT JOIN auth_users au ON au.id = cs.user_id
      WHERE cs.class_id = $1
      ORDER BY cs.type, cs.assigned_at DESC
    `;
    const res = await pool.query(query, [classId]);
    return res.rows.map((row) => this.mapStaffRowToEntity(row));
  }

  async removeStaff(
    classId: string,
    userId: string,
    type: StaffType
  ): Promise<void> {
    const query = `
      DELETE FROM class_staff
      WHERE class_id = $1 AND user_id = $2 AND type = $3
    `;
    await pool.query(query, [classId, userId, type]);
  }

  async isTeacherOfClass(userId: string, classId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM class_staff
        WHERE user_id = $1 AND class_id = $2
      ) AS is_teacher
    `;
    const res = await pool.query(query, [userId, classId]);
    return res.rows[0].is_teacher;
  }

  // --- Mapper ---
  private mapStaffRowToEntity(row: any): ClassStaff {
    return {
      id: row.id,
      classId: row.class_id,
      userId: row.user_id,
      userFullName: row.user_full_name ?? null,
      type: row.type as StaffType,
      assignedAt: row.assigned_at,
    };
  }
}
