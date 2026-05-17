import {
  ClassListRow,
  CompatibleClassListRow,
  IClassRepo,
} from '../../../../domain/classes/repositories/class.repo.port';
import { ClassEntity } from '../../../../domain/classes/entities/class.entity';
import type { ResumeClassCandidateRow } from '../../../../domain/classes/repositories/class.repo.port';
import { CLASS_RULES } from '../../../../config/constants';

export class ClassPgRepo implements IClassRepo {
  constructor(private readonly db: any) {}

  async findById(id: string): Promise<ClassEntity | null> {
    const result = await this.db.query(
      `SELECT
         c.*,
         p.code AS "programCode",
         p.name AS "programName",
         r.room_code AS "roomCode",
         u.id AS "mainTeacherId",
         u.full_name AS "mainTeacherName",
         COALESCE(ec.cnt, 0)::int AS "enrollmentCount"
       FROM classes c
       LEFT JOIN programs p ON c.program_id = p.id
       LEFT JOIN rooms r ON c.room_id = r.id
       LEFT JOIN class_staff cs_main
         ON cs_main.class_id = c.id AND cs_main.effective_to_session IS NULL
       LEFT JOIN users u ON u.id = cs_main.teacher_id AND u.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS cnt
         FROM enrollments e
         WHERE e.class_id = c.id AND e.status IN ('trial', 'active')
       ) ec ON TRUE
       WHERE c.id = $1`,
      [id],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0] as Record<string, unknown>;
    const entity = this.mapRowToClassEntityCore(row);
    return this.decorateClassEntityFromJoinRow(entity, row);
  }

  async findByCode(code: string): Promise<ClassEntity | null> {
    const result = await this.db.query(
      `SELECT
         c.*,
         p.code AS "programCode",
         p.name AS "programName",
         r.room_code AS "roomCode",
         u.id AS "mainTeacherId",
         u.full_name AS "mainTeacherName",
         COALESCE(ec.cnt, 0)::int AS "enrollmentCount"
       FROM classes c
       LEFT JOIN programs p ON c.program_id = p.id
       LEFT JOIN rooms r ON c.room_id = r.id
       LEFT JOIN class_staff cs_main
         ON cs_main.class_id = c.id AND cs_main.effective_to_session IS NULL
       LEFT JOIN users u ON u.id = cs_main.teacher_id AND u.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS cnt
         FROM enrollments e
         WHERE e.class_id = c.id AND e.status IN ('trial', 'active')
       ) ec ON TRUE
       WHERE c.class_code = $1`,
      [code],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0] as Record<string, unknown>;
    const entity = this.mapRowToClassEntityCore(row);
    return this.decorateClassEntityFromJoinRow(entity, row);
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
        c.announced_at AS "announcedAt",
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

  async create(data: Partial<ClassEntity>): Promise<ClassEntity> {
    const result = await this.db.query(
      `INSERT INTO classes (class_code, program_id, room_id, shift, schedule_days, min_capacity, max_capacity, status, start_date, announced_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.classCode, data.programId, data.roomId, data.shift, data.scheduleDays,
        data.minCapacity, data.maxCapacity, data.status || 'pending', data.startDate, data.announcedAt ?? null, data.createdBy
      ]
    );
    return this.mapRowToClassEntityCore(result.rows[0] as Record<string, unknown>);
  }

  async update(id: string, data: Partial<ClassEntity>): Promise<ClassEntity> {
    const result = await this.db.query(
      `UPDATE classes 
       SET shift = COALESCE($1, shift),
           schedule_days = COALESCE($2, schedule_days),
           min_capacity = COALESCE($3, min_capacity),
           max_capacity = COALESCE($4, max_capacity),
           start_date = COALESCE($5, start_date),
           announced_at = COALESCE($6, announced_at),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [data.shift, data.scheduleDays, data.minCapacity, data.maxCapacity, data.startDate, data.announcedAt, id]
    );
    return this.mapRowToClassEntityCore(result.rows[0] as Record<string, unknown>);
  }

  /**
   * Map `classes` row (RETURNING * hoặc c.*) sang {@link ClassEntity} — luôn set `scheduleDays` camelCase
   * để use case (generate-sessions, replace-teacher, …) không đọc nhầm `undefined`.
   */
  private mapRowToClassEntityCore(row: Record<string, unknown>): ClassEntity {
    const sd = row.scheduleDays ?? row.schedule_days;
    const scheduleDays = Array.isArray(sd) ? (sd as number[]) : [];

    const startRaw = row.startDate ?? row.start_date;
    let startDate: Date | undefined;
    if (startRaw instanceof Date) {
      startDate = startRaw;
    } else if (typeof startRaw === 'string' && startRaw.length > 0) {
      const d = new Date(startRaw);
      if (!Number.isNaN(d.getTime())) startDate = d;
    }

    const announcedRaw = row.announcedAt ?? row.announced_at;
    let announcedAt: Date | undefined;
    if (announcedRaw instanceof Date) {
      announcedAt = announcedRaw;
    } else if (typeof announcedRaw === 'string' && announcedRaw.length > 0) {
      const d = new Date(announcedRaw);
      if (!Number.isNaN(d.getTime())) announcedAt = d;
    }

    const createdRaw = row.createdAt ?? row.created_at;
    const createdAt =
      createdRaw instanceof Date ? createdRaw : new Date(String(createdRaw ?? Date.now()));

    const updatedRaw = row.updatedAt ?? row.updated_at;
    const updatedAt =
      updatedRaw instanceof Date ? updatedRaw : new Date(String(updatedRaw ?? Date.now()));

    const shiftNum = Number(row.shift);
    const shift: 1 | 2 = shiftNum === 2 ? 2 : 1;

    return new ClassEntity({
      id: String(row.id ?? ''),
      classCode: String(row.classCode ?? row.class_code ?? ''),
      programId: String(row.programId ?? row.program_id ?? ''),
      roomId: String(row.roomId ?? row.room_id ?? ''),
      shift,
      scheduleDays,
      minCapacity: Number(row.minCapacity ?? row.min_capacity ?? 0),
      maxCapacity: Number(row.maxCapacity ?? row.max_capacity ?? CLASS_RULES.MAX_CAPACITY),
      status: (row.status as ClassEntity['status']) ?? 'pending',
      startDate,
      createdBy:
        row.createdBy != null || row.created_by != null
          ? String(row.createdBy ?? row.created_by)
          : undefined,
      announcedAt,
      createdAt,
      updatedAt,
    });
  }

  /** Gắn field join (program, phòng, GV) lên entity — GET class / findById có đủ metadata cho JSON. */
  private decorateClassEntityFromJoinRow(entity: ClassEntity, row: Record<string, unknown>): ClassEntity {
    type WithJoins = ClassEntity & {
      programCode?: string;
      programName?: string;
      roomCode?: string;
      mainTeacherId?: string;
      mainTeacherName?: string;
      enrollmentCount?: number;
    };
    const out = entity as WithJoins;
    const pc = row.programCode ?? row.program_code;
    if (pc != null && String(pc) !== '') out.programCode = String(pc);
    const pn = row.programName ?? row.program_name;
    if (pn != null && String(pn) !== '') out.programName = String(pn);
    const rc = row.roomCode ?? row.room_code;
    if (rc != null && String(rc) !== '') out.roomCode = String(rc);
    const mtid = row.mainTeacherId ?? row.main_teacher_id;
    if (mtid != null && String(mtid) !== '') out.mainTeacherId = String(mtid);
    const mtn = row.mainTeacherName ?? row.main_teacher_name;
    if (mtn != null && String(mtn).trim() !== '') out.mainTeacherName = String(mtn);
    if (row.enrollmentCount != null || row.enrollment_count != null) {
      out.enrollmentCount = Number(row.enrollmentCount ?? row.enrollment_count ?? 0);
    }
    return out as ClassEntity;
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
    const announcedRaw = row.announcedAt ?? row.announced_at;
    let announcedAt: string | null = null;
    if (announcedRaw instanceof Date) {
      announcedAt = announcedRaw.toISOString();
    } else if (typeof announcedRaw === 'string' && announcedRaw.length > 0) {
      announcedAt = announcedRaw;
    }

    const shiftNum = Number(row.shift);
    const shift: 1 | 2 = shiftNum === 2 ? 2 : 1;

    return {
      id: String(row.id ?? row.class_id ?? ''),
      classCode: String(row.classCode ?? row.class_code ?? ''),
      programId: String(row.programId ?? row.program_id ?? ''),
      programCode:
        row.programCode != null || row.program_code != null
          ? String(row.programCode ?? row.program_code)
          : null,
      programName:
        row.programName != null || row.program_name != null
          ? String(row.programName ?? row.program_name)
          : null,
      roomId: String(row.roomId ?? row.room_id ?? ''),
      roomCode:
        row.roomCode != null || row.room_code != null ? String(row.roomCode ?? row.room_code) : null,
      shift,
      scheduleDays,
      minCapacity: Number(row.minCapacity ?? row.min_capacity ?? 0),
      maxCapacity: Number(row.maxCapacity ?? row.max_capacity ?? CLASS_RULES.MAX_CAPACITY),
      status: (row.status as ClassListRow['status']) ?? 'pending',
      startDate,
      announcedAt,
      mainTeacherId:
        row.mainTeacherId != null || row.main_teacher_id != null
          ? String(row.mainTeacherId ?? row.main_teacher_id)
          : null,
      mainTeacherName:
        row.mainTeacherName != null || row.main_teacher_name != null
          ? String(row.mainTeacherName ?? row.main_teacher_name)
          : null,
      enrollmentCount: Number(row.enrollmentCount ?? row.enrollment_count ?? 0),
      completedSessions: Number(row.completedSessions ?? row.completed_sessions ?? 0),
      totalSessions: Number(row.totalSessions ?? row.total_sessions ?? 24),
    };
  }

  async updateStatus(id: string, status: 'pending' | 'active' | 'closed'): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE classes SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
    return result.rowCount > 0;
  }

  async announce(id: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE classes
       SET announced_at = now(),
           updated_at = now()
       WHERE id = $1
         AND announced_at IS NULL`,
      [id],
    );
    return result.rowCount > 0;
  }

  async findAnnouncedUpcoming(): Promise<ClassListRow[]> {
    const result = await this.db.query(
      `
      SELECT
        c.id AS "id",
        c.class_code AS "classCode",
        c.program_id AS "programId",
        p.code AS "programCode",
        p.name AS "programName",
        c.room_id AS "roomId",
        r.room_code AS "roomCode",
        c.shift AS "shift",
        c.schedule_days AS "scheduleDays",
        c.min_capacity AS "minCapacity",
        c.max_capacity AS "maxCapacity",
        c.status AS "status",
        c.start_date AS "startDate",
        c.announced_at AS "announcedAt",
        u.id AS "mainTeacherId",
        u.full_name AS "mainTeacherName",
        COALESCE(ec.cnt, 0)::int AS "enrollmentCount",
        COALESCE(sc.done, 0)::int AS "completedSessions",
        COALESCE(NULLIF(p.total_sessions, 0), 24)::int AS "totalSessions"
      FROM classes c
      INNER JOIN programs p ON p.id = c.program_id
      INNER JOIN rooms r ON r.id = c.room_id
      LEFT JOIN class_staff cs
        ON cs.class_id = c.id AND cs.effective_to_session IS NULL
      LEFT JOIN users u ON u.id = cs.teacher_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM enrollments e
        WHERE e.class_id = c.id AND e.status IN ('pending', 'trial', 'active')
      ) ec ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS done
        FROM sessions s
        WHERE s.class_id = c.id AND s.status = 'completed'
      ) sc ON TRUE
      WHERE c.announced_at IS NOT NULL
        AND c.status = 'pending'
      ORDER BY c.announced_at DESC
      `,
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRowToClassList(row));
  }

  async findCompatibleClasses(
    programId: string,
    unavailableDays: number[],
    shift: 1 | 2 | null,
  ): Promise<CompatibleClassListRow[]> {
    const result = await this.db.query(
      `SELECT * FROM find_compatible_classes($1::uuid, $2::smallint[], $3::smallint)`,
      [programId, unavailableDays, shift],
    );
    return result.rows.map((row: Record<string, unknown>) => {
      const base = this.mapRowToClassList(row);
      return {
        ...base,
        availableSlots: Number(row.available_slots ?? 0),
      };
    });
  }

  async findResumeClassCandidates(
    programId: string,
    excludeClassId?: string | null,
  ): Promise<ResumeClassCandidateRow[]> {
    const result = await this.db.query(
      `
      SELECT
        c.id AS "classId",
        c.class_code AS "classCode",
        c.max_capacity AS "maxCapacity",
        c.status::VARCHAR AS status,
        COUNT(e.id) FILTER (
          WHERE e.status IN ('trial', 'active', 'reserved')
        )::INT AS "enrollmentCount",
        COALESCE((
          SELECT COUNT(*)::INT FROM sessions s
          WHERE s.class_id = c.id AND s.status = 'completed'
        ), 0) AS "completedSessions",
        COALESCE((
          SELECT COUNT(*)::INT FROM sessions s
          WHERE s.class_id = c.id AND s.status = 'pending'
        ), 0) AS "pendingSessions"
      FROM classes c
      LEFT JOIN enrollments e ON e.class_id = c.id
      WHERE c.program_id = $1
        AND c.status IN ('pending', 'active')
        AND ($2::uuid IS NULL OR c.id <> $2::uuid)
      GROUP BY c.id, c.class_code, c.max_capacity, c.status
      HAVING c.max_capacity > COUNT(e.id) FILTER (
        WHERE e.status IN ('trial', 'active', 'reserved')
      )
      `,
      [programId, excludeClassId ?? null],
    );
    return result.rows.map((row: Record<string, unknown>) => {
      const maxCapacity = Number(row.maxCapacity ?? 12);
      const enrollmentCount = Number(row.enrollmentCount ?? 0);
      const availableSlots = Math.max(0, maxCapacity - enrollmentCount);
      return {
        classId: String(row.classId),
        classCode: String(row.classCode),
        maxCapacity,
        status: row.status as 'pending' | 'active' | 'closed',
        enrollmentCount,
        completedSessions: Number(row.completedSessions ?? 0),
        pendingSessions: Number(row.pendingSessions ?? 0),
        availableSlots,
      };
    });
  }
}
