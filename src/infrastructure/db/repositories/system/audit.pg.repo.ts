import { pool } from "../../pg-pool";
import { AuditLog } from "../../../../domain/system/entities/audit-log.entity";
import {
  AuditRepoPort,
  AuditListParams,
  AuditCountParams,
  AuditCreateInput,
} from "../../../../domain/system/repositories/audit.repo.port";

/**
 * Implementation PostgreSQL cho AuditRepoPort.
 * Tương tác trực tiếp với bảng system_audit_logs.
 */
export class AuditPgRepo implements AuditRepoPort {
  /** Chuyển row từ DB sang AuditLog entity */
  private mapRow(row: any): AuditLog {
    return {
      id:           row.id,
      actorUserId:  row.actor_user_id ?? undefined,
      action:       row.action,
      entity:       row.entity,
      entityId:     row.entity_id ?? undefined,
      meta:         row.meta ?? {},
      createdAt:    new Date(row.created_at),
    };
  }

  /**
   * Xây dựng điều kiện WHERE và mảng params dùng chung cho list và count.
   * Trả về { conditions: string[], values: any[] }
   */
  private buildFilters(params: AuditCountParams): { conditions: string[]; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.actorUserId) {
      conditions.push(`actor_user_id = $${idx++}`);
      values.push(params.actorUserId);
    }

    if (params.action) {
      conditions.push(`action = $${idx++}`);
      values.push(params.action);
    }

    if (params.fromDate) {
      // Lọc từ ngày bắt đầu (created_at >= fromDate)
      conditions.push(`created_at >= $${idx++}`);
      values.push(params.fromDate);
    }

    if (params.toDate) {
      // Lọc đến ngày kết thúc (created_at <= toDate)
      conditions.push(`created_at <= $${idx++}`);
      values.push(params.toDate);
    }

    return { conditions, values };
  }

  /**
   * Lấy danh sách audit log với filter và phân trang.
   * Sắp xếp mới nhất lên đầu.
   */
  async list(params: AuditListParams): Promise<AuditLog[]> {
    const { conditions, values } = this.buildFilters(params);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Thêm tham số LIMIT và OFFSET vào cuối
    const limit  = params.limit  ?? 50;
    const offset = params.offset ?? 0;
    const limitIdx  = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM system_audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Đếm tổng số audit log thoả mãn bộ lọc (dùng cho phân trang).
   */
  async count(params: AuditCountParams): Promise<number> {
    const { conditions, values } = this.buildFilters(params);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM system_audit_logs ${where}`,
      values
    );

    return rows[0]?.total ?? 0;
  }

  /**
   * Tạo một bản ghi audit log mới.
   * meta được lưu dạng jsonb bằng cách JSON.stringify.
   */
  async create(input: AuditCreateInput): Promise<AuditLog> {
    const meta = input.meta ?? {};

    const { rows } = await pool.query(
      `INSERT INTO system_audit_logs
         (actor_user_id, action, entity, entity_id, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [
        input.actorUserId ?? null,  // NULL nếu là hệ thống
        input.action,
        input.entity,
        input.entityId ?? null,
        JSON.stringify(meta),       // Serialize object sang chuỗi JSON cho cột jsonb
      ]
    );

    return this.mapRow(rows[0]);
  }
}
