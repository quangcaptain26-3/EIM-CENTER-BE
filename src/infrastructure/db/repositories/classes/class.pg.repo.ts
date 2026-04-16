import {
  ClassListRow,
  IClassRepo,
} from '../../../../domain/classes/repositories/class.repo.port';
import { ClassEntity } from '../../../../domain/classes/entities/class.entity';

export class ClassPgRepo implements IClassRepo {
  constructor(private readonly db: any) {}

  async findById(id: string): Promise<ClassEntity | null> {
    const result = await this.db.query(
      `SELECT c.*, p.code as "programCode", r.room_code as "roomCode"
       FROM classes c
       LEFT JOIN programs p ON c.program_id = p.id
       LEFT JOIN rooms r ON c.room_id = r.id
       WHERE c.id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    return new ClassEntity(result.rows[0]);
  }

  async findByCode(code: string): Promise<ClassEntity | null> {
    const result = await this.db.query(
      `SELECT c.*, p.code as "programCode", r.room_code as "roomCode"
       FROM classes c
       LEFT JOIN programs p ON c.program_id = p.id
       LEFT JOIN rooms r ON c.room_id = r.id
       WHERE c.class_code = $1`,
      [code]
    );
    if (!result.rows[0]) return null;
    return new ClassEntity(result.rows[0]);
  }

  async findAll(
    filter: {
      programCode?: string;
      programId?: string;
      status?: 'pending' | 'active' | 'closed';
      roomId?: string;
      teacherId?: string;
      shift?: 1 | 2;
      search?: string;
    },
    paginate: { limit: number; offset: number },
  ): Promise<{ data: ClassListRow[]; total: number }> {
    const fromSql = `
      FROM classes c
      LEFT JOIN programs p ON c.program_id = p.id
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN class_staff cs_main
        ON cs_main.class_id = c.id AND cs_main.effective_to_session IS NULL
      LEFT JOIN users u ON u.id = cs_main.teacher_id AND u.deleted_at IS NULL
    `;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filter.programCode) {
      conditions.push(`p.code = $${idx++}`);
      values.push(filter.programCode);
    }
    if (filter.programId) {
      conditions.push(`c.program_id = $${idx++}`);
      values.push(filter.programId);
    }
    if (filter.status) {
      conditions.push(`c.status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.roomId) {
      conditions.push(`c.room_id = $${idx++}`);
      values.push(filter.roomId);
    }
    if (filter.shift === 1 || filter.shift === 2) {
      conditions.push(`c.shift = $${idx++}`);
      values.push(filter.shift);
    }
    if (filter.teacherId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM class_staff csf
        WHERE csf.class_id = c.id
          AND csf.teacher_id = $${idx++}
          AND csf.effective_to_session IS NULL
      )`);
      values.push(filter.teacherId);
    }
    if (filter.search && filter.search.length > 0) {
      const pattern = `%${filter.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      conditions.push(
        `(c.class_code ILIKE $${idx} ESCAPE '\\' OR COALESCE(u.full_name, '') ILIKE $${idx} ESCAPE '\\')`,
      );
      values.push(pattern);
      idx += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query(
      `SELECT COUNT(DISTINCT c.id)::int AS cnt ${fromSql} ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.cnt ?? 0);

    const dataResult = await this.db.query(
      `
      SELECT
        c.id AS "id",
        c.class_code AS "classCode",
        c.program_id AS "programId",
        c.room_id AS "roomId",
        c.shift AS "shift",
        c.schedule_days AS "scheduleDays",
        c.min_capacity AS "minCapacity",
        c.max_capacity AS "maxCapacity",
        c.status AS "status",
        c.start_date AS "startDate",
        p.code AS "programCode",
        p.name AS "programName",
        r.room_code AS "roomCode",
        u.id AS "mainTeacherId",
        u.full_name AS "mainTeacherName",
        COALESCE(ec.cnt, 0)::int AS "enrollmentCount",
        COALESCE(sc.done, 0)::int AS "completedSessions",
        COALESCE(NULLIF(p.total_sessions, 0), 24)::int AS "totalSessions"
      ${fromSql}
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM enrollments e
        WHERE e.class_id = c.id AND e.status IN ('trial', 'active')
      ) ec ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS done
        FROM sessions s
        WHERE s.class_id = c.id AND s.status = 'completed'
      ) sc ON TRUE
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
      `,
      [...values, paginate.limit, paginate.offset],
    );

    const data: ClassListRow[] = dataResult.rows.map((row: Record<string, unknown>) =>
      this.mapRowToClassList(row),
    );

    return { data, total };
  }

  private mapRowToClassList(row: Record<string, unknown>): ClassListRow {
    const sd = row.scheduleDays ?? row.schedule_days;
    const scheduleDays = Array.isArray(sd) ? (sd as number[]) : [];

    const startRaw = row.startDate ?? row.start_date;
    let startDate: string | null = null;
    if (startRaw instanceof Date) {
      startDate = startRaw.toISOString().slice(0, 10);
    } else if (typeof startRaw === 'string' && startRaw.length > 0) {
      startDate = startRaw.slice(0, 10);
    }

    const shiftNum = Number(row.shift);
    const shift: 1 | 2 = shiftNum === 2 ? 2 : 1;

    return {
      id: String(row.id),
      classCode: String(row.classCode ?? row.class_code ?? ''),
      programId: String(row.programId ?? row.program_id ?? ''),
      programCode: row.programCode != null ? String(row.programCode) : null,
      programName: row.programName != null ? String(row.programName) : null,
      roomId: String(row.roomId ?? row.room_id ?? ''),
      roomCode: row.roomCode != null ? String(row.roomCode) : null,
      shift,
      scheduleDays,
      minCapacity: Number(row.minCapacity ?? row.min_capacity ?? 0),
      maxCapacity: Number(row.maxCapacity ?? row.max_capacity ?? 12),
      status: (row.status as ClassListRow['status']) ?? 'pending',
      startDate,
      mainTeacherId: row.mainTeacherId != null ? String(row.mainTeacherId) : null,
      mainTeacherName: row.mainTeacherName != null ? String(row.mainTeacherName) : null,
      enrollmentCount: Number(row.enrollmentCount ?? 0),
      completedSessions: Number(row.completedSessions ?? 0),
      totalSessions: Number(row.totalSessions ?? 24),
    };
  }

  async create(data: Partial<ClassEntity>): Promise<ClassEntity> {
    const result = await this.db.query(
      `INSERT INTO classes (class_code, program_id, room_id, shift, schedule_days, min_capacity, max_capacity, status, start_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.classCode, data.programId, data.roomId, data.shift, data.scheduleDays,
        data.minCapacity, data.maxCapacity, data.status || 'pending', data.startDate, data.createdBy
      ]
    );
    return new ClassEntity(result.rows[0]);
  }

  async update(id: string, data: Partial<ClassEntity>): Promise<ClassEntity> {
    const result = await this.db.query(
      `UPDATE classes 
       SET shift = COALESCE($1, shift),
           schedule_days = COALESCE($2, schedule_days),
           min_capacity = COALESCE($3, min_capacity),
           max_capacity = COALESCE($4, max_capacity),
           start_date = COALESCE($5, start_date),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [data.shift, data.scheduleDays, data.minCapacity, data.maxCapacity, data.startDate, id]
    );
    return new ClassEntity(result.rows[0]);
  }

  async updateStatus(id: string, status: 'pending' | 'active' | 'closed'): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE classes SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
    return result.rowCount > 0;
  }
}
