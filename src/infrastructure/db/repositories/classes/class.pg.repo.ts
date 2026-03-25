import { Pool } from "pg";
import {
  Class,
  ClassSchedule,
} from "../../../../domain/classes/entities/class.entity";
import {
  ClassCountParams,
  ClassListParams,
  ClassRepoPort,
  CreateClassInput,
  UpdateClassInput,
  UpsertScheduleInput,
} from "../../../../domain/classes/repositories/class.repo.port";

import { pool } from "../../pg-pool";

export class ClassPgRepo implements ClassRepoPort {
  async list(params: ClassListParams): Promise<Class[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(c.code ILIKE $${idx} OR c.name ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    if (params.programId) {
      conditions.push(`c.program_id = $${idx}`);
      values.push(params.programId);
      idx++;
    }

    if (params.status) {
      conditions.push(`c.status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    const whereStr =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let limitStr = "";
    if (params.limit) {
      limitStr = `LIMIT $${idx}`;
      values.push(params.limit);
      idx++;
    }

    let offsetStr = "";
    if (params.offset) {
      offsetStr = `OFFSET $${idx}`;
      values.push(params.offset);
      idx++;
    }

    // Filter: status (ACTIVE/PAUSED/CLOSED), program_id, search (code/name)
    const query = `
      SELECT 
        c.id, 
        c.code, 
        c.name, 
        c.program_id, 
        p.name AS program_name,
        c.room, 
        c.capacity, 
        c.start_date, 
        c.status, 
        c.created_at,
        -- Subquery: đếm enrollments ACTIVE = sĩ số hiện tại
        (SELECT COUNT(*)::INT FROM enrollments e WHERE e.class_id = c.id AND e.status = 'ACTIVE') AS current_size,
        -- Số chỗ còn trống = capacity - count(enrollments ACTIVE) — dùng cho tìm lớp còn chỗ
        c.capacity - (SELECT COUNT(*)::INT FROM enrollments e WHERE e.class_id = c.id AND e.status = 'ACTIVE') AS remaining_capacity
      FROM classes c
      JOIN curriculum_programs p ON p.id = c.program_id
      ${whereStr}
      ORDER BY c.created_at DESC
      ${limitStr} ${offsetStr}
    `;

    const res = await pool.query(query, values);
    return res.rows.map(this.mapClassRowToEntity);
  }

  async count(params: ClassCountParams): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(code ILIKE $${idx} OR name ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    if (params.programId) {
      conditions.push(`program_id = $${idx}`);
      values.push(params.programId);
      idx++;
    }

    if (params.status) {
      conditions.push(`status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    const whereStr =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `SELECT COUNT(*)::INT as total FROM classes ${whereStr}`;
    const res = await pool.query(query, values);
    return res.rows[0]?.total || 0;
  }

  async findById(id: string): Promise<Class | null> {
    const query = `
      SELECT id, code, name, program_id, room, capacity, start_date, status, created_at
      FROM classes
      WHERE id = $1
    `;
    const res = await pool.query(query, [id]);
    if (res.rowCount === 0) return null;
    return this.mapClassRowToEntity(res.rows[0]);
  }

  /** Lấy lớp theo mã lớp — dùng cho thao tác thân thiện (không nhập UUID) */
  async findByCode(code: string): Promise<Class | null> {
    const trimmed = String(code).trim();
    if (!trimmed) return null;
    const query = `
      SELECT id, code, name, program_id, room, capacity, start_date, status, created_at
      FROM classes
      WHERE UPPER(TRIM(code)) = UPPER($1)
    `;
    const res = await pool.query(query, [trimmed]);
    if (res.rowCount === 0) return null;
    return this.mapClassRowToEntity(res.rows[0]);
  }

  async create(input: CreateClassInput): Promise<Class> {
    const query = `
      INSERT INTO classes (code, name, program_id, room, capacity, start_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'ACTIVE'))
      RETURNING id, code, name, program_id, room, capacity, start_date, status, created_at
    `;
    const values = [
      input.code,
      input.name,
      input.programId,
      input.room || null,
      input.capacity,
      input.startDate,
      input.status,
    ];

    const res = await pool.query(query, values);
    return this.mapClassRowToEntity(res.rows[0]);
  }

  async update(id: string, patch: UpdateClassInput): Promise<Class> {
    const setClauses: string[] = [];
    const values: any[] = [id];
    let idx = 2;

    if (patch.code !== undefined) {
      setClauses.push(`code = $${idx++}`);
      values.push(patch.code);
    }
    if (patch.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(patch.name);
    }
    if (patch.programId !== undefined) {
      setClauses.push(`program_id = $${idx++}`);
      values.push(patch.programId);
    }
    if (patch.room !== undefined) {
      setClauses.push(`room = $${idx++}`);
      values.push(patch.room);
    }
    if (patch.capacity !== undefined) {
      setClauses.push(`capacity = $${idx++}`);
      values.push(patch.capacity);
    }
    if (patch.startDate !== undefined) {
      setClauses.push(`start_date = $${idx++}`);
      values.push(patch.startDate);
    }
    if (patch.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(patch.status);
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error("Chưa tồn tại class để cập nhật");
      return existing;
    }

    const query = `
      UPDATE classes
      SET ${setClauses.join(", ")}
      WHERE id = $1
      RETURNING id, code, name, program_id, room, capacity, start_date, status, created_at
    `;

    const res = await pool.query(query, values);
    if (res.rowCount === 0) {
      throw new Error(`Class with id ${id} not found for update`);
    }
    return this.mapClassRowToEntity(res.rows[0]);
  }

  async listSchedules(classId: string): Promise<ClassSchedule[]> {
    const query = `
      SELECT id, class_id, weekday, start_time, end_time, created_at
      FROM class_schedules
      WHERE class_id = $1
      ORDER BY weekday, start_time
    `;
    const res = await pool.query(query, [classId]);
    return res.rows.map(this.mapScheduleRowToEntity);
  }

  async upsertSchedules(
    classId: string,
    schedules: UpsertScheduleInput[]
  ): Promise<ClassSchedule[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Xóa toàn bộ schedule hiện tại của lớp
      await client.query("DELETE FROM class_schedules WHERE class_id = $1", [
        classId,
      ]);

      const insertedEntities: ClassSchedule[] = [];

      // Thêm mới schedules
      if (schedules.length > 0) {
        // Dùng vòng lặp insert hoặc multi-value insert. Để đơn giản và hỗ trợ parameterization an toàn:
        const insertQuery = `
          INSERT INTO class_schedules (class_id, weekday, start_time, end_time)
          VALUES ($1, $2, $3, $4)
          RETURNING id, class_id, weekday, start_time, end_time, created_at
        `;

        for (const s of schedules) {
          const res = await client.query(insertQuery, [
            classId,
            s.weekday,
            s.startTime,
            s.endTime,
          ]);
          insertedEntities.push(this.mapScheduleRowToEntity(res.rows[0]));
        }
      }

      await client.query("COMMIT");
      return insertedEntities;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Mapper ---

  private mapClassRowToEntity(r: any): Class {
    const currentSize = typeof r.current_size === "number" ? r.current_size : Number(r.current_size ?? 0);
    const remainingCapacity = typeof r.remaining_capacity === "number" ? r.remaining_capacity : Number(r.remaining_capacity ?? 0);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      programId: r.program_id,
      programName: r.program_name ?? null,
      room: r.room,
      capacity: r.capacity,
      currentSize,
      remainingCapacity,
      startDate: r.start_date, // tùy driver pg có thể parse thành JS Date
      status: r.status,
      createdAt: r.created_at,
    };
  }

  private mapScheduleRowToEntity(r: any): ClassSchedule {
    return {
      id: r.id,
      classId: r.class_id,
      weekday: r.weekday,
      startTime: r.start_time, // dạng string '18:00:00'
      endTime: r.end_time,
      createdAt: r.created_at,
    };
  }
}
