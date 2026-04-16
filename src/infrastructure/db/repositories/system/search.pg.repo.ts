import { Pool } from 'pg';
import {
  ISearchRepo,
  StudentSearchResult,
  UserSearchResult,
  ClassSearchResult,
} from '../../../../domain/system/repositories/search.repo.port';

const BASE_STUDENT_QUERY = `
  SELECT 
    s.id, s.student_code, s.full_name, s.dob, s.parent_name, s.parent_phone, s.parent_phone2, s.school_name,
    e.class_id, c.class_code, e.program_id, p.code as program_code, e.status as enrollment_status
  FROM mv_search_students s
  LEFT JOIN LATERAL (
    SELECT e.class_id, e.program_id, e.status
    FROM enrollments e
    WHERE e.student_id = s.id
      AND e.status IN ('pending', 'trial', 'active', 'paused')
    ORDER BY 
      CASE e.status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END,
      e.enrolled_at DESC
    LIMIT 1
  ) e ON true
  LEFT JOIN classes c ON c.id = e.class_id
  LEFT JOIN programs p ON p.id = e.program_id
`;

const mapStudentRow = (row: any): StudentSearchResult => ({
  id: row.id,
  studentCode: row.student_code,
  fullName: row.full_name,
  dob: row.dob,
  parentName: row.parent_name,
  parentPhone: row.parent_phone,
  parentPhone2: row.parent_phone2,
  schoolName: row.school_name,
  activeEnrollment: row.class_id ? {
    classId: row.class_id,
    classCode: row.class_code,
    programId: row.program_id,
    programCode: row.program_code,
    status: row.enrollment_status,
  } : undefined,
});

const BASE_USER_QUERY = `
  SELECT id, user_code, full_name, phone, cccd, role_code
  FROM mv_search_users
`;

export class SearchPgRepo implements ISearchRepo {
  constructor(private readonly pool: Pool) {}

  async searchStudentsByCode(code: string, limit: number): Promise<StudentSearchResult[]> {
    const { rows } = await this.pool.query(
      `${BASE_STUDENT_QUERY} WHERE s.student_code ILIKE $1 LIMIT $2`,
      [code, limit]
    );
    return rows.map(mapStudentRow);
  }

  async searchStudentsByPhone(phone: string, limit: number): Promise<StudentSearchResult[]> {
    const { rows } = await this.pool.query(
      `${BASE_STUDENT_QUERY} WHERE s.parent_phone = $1 OR s.parent_phone2 = $1 LIMIT $2`,
      [phone, limit]
    );
    return rows.map(mapStudentRow);
  }

  async searchStudentsByDob(dob: Date, limit: number): Promise<StudentSearchResult[]> {
    const { rows } = await this.pool.query(
      `${BASE_STUDENT_QUERY} WHERE s.dob = $1 LIMIT $2`,
      [dob, limit]
    );
    return rows.map(mapStudentRow);
  }

  async searchStudentsFts(query: string, limit: number): Promise<StudentSearchResult[]> {
    const { rows } = await this.pool.query(
      `${BASE_STUDENT_QUERY} 
       WHERE s.search_vector @@ plainto_tsquery('simple', unaccent($1))
          OR s.full_name ILIKE '%' || $1 || '%'
          OR s.parent_name ILIKE '%' || $1 || '%'
          OR s.school_name ILIKE '%' || $1 || '%'
       LIMIT $2`,
      [query, limit]
    );
    return rows.map(mapStudentRow);
  }

  async searchUsersByCode(code: string, roleCode?: string, limit: number = 20): Promise<UserSearchResult[]> {
    const params: any[] = [code, limit];
    let queryStr = `${BASE_USER_QUERY} WHERE user_code ILIKE $1`;
    if (roleCode) {
      queryStr += ` AND role_code = $3`;
      params.push(roleCode);
    }
    queryStr += ` LIMIT $2`;
    
    const { rows } = await this.pool.query(queryStr, params);
    return rows.map(r => ({
      id: r.id, userCode: r.user_code, fullName: r.full_name, phone: r.phone, cccd: r.cccd, roleCode: r.role_code,
    }));
  }

  async searchUsersByPhoneOrCccd(phoneOrCccd: string, roleCode?: string, limit: number = 20): Promise<UserSearchResult[]> {
    const params: any[] = [phoneOrCccd, limit];
    let queryStr = `${BASE_USER_QUERY} WHERE (phone = $1 OR cccd = $1)`;
    if (roleCode) {
      queryStr += ` AND role_code = $3`;
      params.push(roleCode);
    }
    queryStr += ` LIMIT $2`;
    
    const { rows } = await this.pool.query(queryStr, params);
    return rows.map(r => ({
      id: r.id, userCode: r.user_code, fullName: r.full_name, phone: r.phone, cccd: r.cccd, roleCode: r.role_code,
    }));
  }

  async searchUsersFts(query: string, roleCode?: string, limit: number = 20): Promise<UserSearchResult[]> {
    const params: any[] = [query, limit];
    let queryStr = `${BASE_USER_QUERY} WHERE (search_vector @@ plainto_tsquery('simple', unaccent($1)) OR full_name ILIKE '%' || $1 || '%')`;
    if (roleCode) {
      queryStr += ` AND role_code = $3`;
      params.push(roleCode);
    }
    queryStr += ` LIMIT $2`;
    
    const { rows } = await this.pool.query(queryStr, params);
    return rows.map(r => ({
      id: r.id, userCode: r.user_code, fullName: r.full_name, phone: r.phone, cccd: r.cccd, roleCode: r.role_code,
    }));
  }

  async searchClasses(query: string, limit: number = 20): Promise<ClassSearchResult[]> {
    const { rows } = await this.pool.query(
      `SELECT
        c.id, c.class_code, c.status,
        p.code as program_code, p.name as program_name,
        r.room_code,
        u.full_name as teacher_name,
        (SELECT count(*)::int FROM enrollments e WHERE e.class_id = c.id AND e.status IN ('trial', 'active', 'pending')) as enrollment_count
      FROM classes c
      JOIN programs p ON p.id = c.program_id
      JOIN rooms r ON r.id = c.room_id
      LEFT JOIN class_staff cs ON cs.class_id = c.id AND cs.effective_to_session IS NULL
      LEFT JOIN users u ON u.id = cs.teacher_id
      WHERE c.class_code ILIKE '%' || $1 || '%'
         OR p.code ILIKE '%' || $1 || '%'
         OR r.room_code ILIKE '%' || $1 || '%'
         OR u.full_name ILIKE '%' || $1 || '%'
      LIMIT $2`,
      [query, limit]
    );

    return rows.map(r => ({
      id: r.id,
      classCode: r.class_code,
      programCode: r.program_code,
      programName: r.program_name,
      roomCode: r.room_code,
      teacherName: r.teacher_name,
      status: r.status,
      enrollmentCount: r.enrollment_count,
    }));
  }
}
