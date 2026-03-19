import { AuditLog } from "../entities/audit-log.entity";

/**
 * Tham số lọc khi lấy danh sách audit log.
 */
export interface AuditListParams {
  actorUserId?: string; // Lọc theo người thực hiện
  action?: string;      // Lọc theo loại hành động
  fromDate?: Date;      // Lọc từ ngày (created_at >=)
  toDate?: Date;        // Lọc đến ngày (created_at <=)
  limit?: number;       // Số bản ghi tối đa
  offset?: number;      // Bỏ qua bao nhiêu bản ghi (phân trang)
}

/**
 * Tham số đếm số lượng audit log.
 */
export interface AuditCountParams {
  actorUserId?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Input tạo mới một audit log.
 */
export interface AuditCreateInput {
  actorUserId?: string;       // Người thực hiện (null nếu hệ thống / anonymous)
  action: string;             // Hành động, ví dụ: "AUTH_LOGIN"
  entity: string;             // Đối tượng bị tác động, ví dụ: "auth_user"
  entityId?: string;          // UUID bản ghi bị tác động
  meta?: Record<string, any>; // Thông tin bổ sung
}

/**
 * Port Repository cho Audit Log.
 * Chỉ khai báo interface — implementation ở infrastructure layer.
 */
export interface AuditRepoPort {
  /**
   * Lấy danh sách audit log, hỗ trợ lọc theo actor/action/khoảng thời gian.
   */
  list(params: AuditListParams): Promise<AuditLog[]>;

  /**
   * Đếm tổng số audit log thoả mãn bộ lọc (dùng cho phân trang).
   */
  count(params: AuditCountParams): Promise<number>;

  /**
   * Tạo một bản ghi audit log mới.
   */
  create(input: AuditCreateInput): Promise<AuditLog>;
}
