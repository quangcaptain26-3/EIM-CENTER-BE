import { Pool } from "pg";
import { 
  TrialLead, 
  TrialSchedule, 
  TrialConversion 
} from "../../../../domain/trials/entities/trial-lead.entity";
import { 
  TrialRepoPort, 
  TrialListParams, 
  TrialCreateParams, 
  TrialUpdateParams 
} from "../../../../domain/trials/repositories/trial.repo.port";

export class PostgresTrialRepository implements TrialRepoPort {
  constructor(private readonly pool: Pool) {}

  /**
   * Lấy danh sách TrialLeads với tính năng tìm kiếm và phân trang
   * @param params Điều kiện tìm kiếm (search fullName/phone/email bằng ILIKE, status, limit, offset)
   */
  async list(params: TrialListParams): Promise<TrialLead[]> {
    const { search, status, limit = 20, offset = 0 } = params;
    
    // Nhúng schedule để FE hiển thị nhanh ngay ở trang danh sách (không phải chỉ trang chi tiết)
    let query = `
      SELECT
        tl.*,
        ts.id AS schedule_id,
        ts.class_id AS schedule_class_id,
        ts.trial_date AS schedule_trial_date,
        ts.created_at AS schedule_created_at
      FROM trial_leads tl
      LEFT JOIN trial_schedules ts ON ts.trial_id = tl.id
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      // Tìm kiếm ILIKE theo full_name, phone, hoặc email
      query += ` AND (tl.full_name ILIKE $${paramIndex} OR tl.phone ILIKE $${paramIndex} OR tl.email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND tl.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    query += ` ORDER BY tl.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapToEntity);
  }

  /**
   * Đếm tổng số lượng TrialLeads phục vụ cho phân trang
   */
  async count(params: Omit<TrialListParams, "limit" | "offset">): Promise<number> {
    const { search, status } = params;
    
    let query = `SELECT COUNT(*) FROM trial_leads WHERE 1=1`;
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (full_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Tạo mới một TrialLead
   */
  async create(input: TrialCreateParams): Promise<TrialLead> {
    const query = `
      INSERT INTO trial_leads (full_name, phone, email, source, status, note, created_by, created_at)
      VALUES ($1, $2, $3, $4, 'NEW', $5, $6, NOW())
      RETURNING *;
    `;
    const values = [
      input.fullName,
      input.phone,
      input.email ?? null,
      input.source ?? null,
      input.note ?? null,
      input.createdBy ?? null
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapToEntity(result.rows[0]);
  }

  /**
   * Tìm kiếm bộ hồ sơ khách hàng học thử theo ID
   */
  async findById(id: string): Promise<TrialLead | null> {
    const query = `SELECT * FROM trial_leads WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) return null;
    return this.mapToEntity(result.rows[0]);
  }

  /**
   * Cập nhật thông tin TrialLead
   */
  async update(id: string, patch: TrialUpdateParams): Promise<TrialLead> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (patch.fullName !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(patch.fullName);
    }
    if (patch.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(patch.phone);
    }
    if (patch.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(patch.email);
    }
    if (patch.source !== undefined) {
      fields.push(`source = $${paramIndex++}`);
      values.push(patch.source);
    }
    if (patch.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(patch.status);
    }
    if (patch.note !== undefined) {
      fields.push(`note = $${paramIndex++}`);
      values.push(patch.note);
    }

    // Nếu không có field nào cần update
    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error("TrialLead not found");
      return existing;
    }

    values.push(id);
    const query = `
      UPDATE trial_leads
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    const result = await this.pool.query(query, values);
    return this.mapToEntity(result.rows[0]);
  }

  /**
   * Lên lịch học thử hoặc cập nhật nếu đã tồn tại lịch học thử.
   * Đồng thời cập nhật trạng thái leads từ NEW/CONTACTED thành SCHEDULED.
   */
  async upsertSchedule(trialId: string, classId: string, trialDate: Date): Promise<TrialSchedule> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      
      // 1. Thêm hoặc cập nhật (Upsert) một TrialSchedule
      const scheduleQuery = `
        INSERT INTO trial_schedules (trial_id, class_id, trial_date, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (trial_id) 
        DO UPDATE SET 
          class_id = EXCLUDED.class_id, 
          trial_date = EXCLUDED.trial_date
        RETURNING *;
      `;
      const scheduleResult = await client.query(scheduleQuery, [trialId, classId, trialDate]);
      const schedule = scheduleResult.rows[0];

      // 2. Tự động chuyển status của Lead thành SCHEDULED nếu nó đang là NEW hoặc CONTACTED
      const updateStatusQuery = `
        UPDATE trial_leads 
        SET status = 'SCHEDULED' 
        WHERE id = $1 AND status IN ('NEW', 'CONTACTED')
      `;
      await client.query(updateStatusQuery, [trialId]);

      await client.query("COMMIT");

      return this.mapScheduleToEntity(schedule);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lấy lịch học thử của một lead
   */
  async findSchedule(trialId: string): Promise<TrialSchedule | null> {
    const query = `SELECT * FROM trial_schedules WHERE trial_id = $1`;
    const result = await this.pool.query(query, [trialId]);
    
    if (result.rows.length === 0) return null;
    return this.mapScheduleToEntity(result.rows[0]);
  }

  /**
   * Trial scheduled quá N ngày — dùng để notify Sales (rule: trial_date < NOW() - 1 day).
   */
  async listScheduledOverdue(deltaDays: number = 1): Promise<TrialLead[]> {
    const query = `
      SELECT tl.*
      FROM trial_leads tl
      JOIN trial_schedules ts ON ts.trial_id = tl.id
      WHERE tl.status = 'SCHEDULED'
        AND ts.trial_date < NOW() - make_interval(days => $1::int)
      ORDER BY ts.trial_date ASC
    `;
    const result = await this.pool.query(query, [deltaDays]);
    return result.rows.map((r) => this.mapToEntity(r));
  }

  /**
   * Chuyển đổi trạng thái từ học thử sang học viên chính thức,
   * lưu lịch sử conversion vào bảng trial_conversions.
   */
  async createConversion(trialId: string, studentId: string, enrollmentId: string): Promise<TrialConversion> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      
      // 1. Ghi nhận thông tin chuyển đổi (trial_conversions)
      const convQuery = `
        INSERT INTO trial_conversions (trial_id, student_id, enrollment_id, converted_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *;
      `;
      const convResult = await client.query(convQuery, [trialId, studentId, enrollmentId]);
      const conversion = convResult.rows[0];

      // 2. Chuyển trạng thái TrialLead thành CONVERTED
      const updateLeadQuery = `
        UPDATE trial_leads 
        SET status = 'CONVERTED' 
        WHERE id = $1
      `;
      await client.query(updateLeadQuery, [trialId]);

      await client.query("COMMIT");
      
      return {
        id: conversion.id,
        trialId: conversion.trial_id,
        studentId: conversion.student_id,
        enrollmentId: conversion.enrollment_id,
        convertedAt: conversion.converted_at
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // --- Utility Mappers --- //

  private mapToEntity(row: any): TrialLead {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      source: row.source,
      status: row.status,
      note: row.note,
      createdBy: row.created_by,
      createdAt: row.created_at,
      schedule: row.schedule_id
        ? {
            id: row.schedule_id,
            trialId: row.id,
            classId: row.schedule_class_id,
            trialDate: row.schedule_trial_date,
            createdAt: row.schedule_created_at,
          }
        : null,
    };
  }

  private mapScheduleToEntity(row: any): TrialSchedule {
    return {
      id: row.id,
      trialId: row.trial_id,
      classId: row.class_id,
      trialDate: row.trial_date,
      createdAt: row.created_at
    };
  }
}
