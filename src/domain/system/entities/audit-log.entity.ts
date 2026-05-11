/**
 * Audit Log Entity
 *
 * Đại diện cho một bản ghi sự kiện trong hệ thống.
 * action format: 'DOMAIN:event'  (ví dụ: 'AUTH:login', 'USER:created', 'ENROLLMENT:activated')
 */
export interface AuditLogEntity {
  /** UUID primary key */
  id: string;

  /** Thời điểm sự kiện xảy ra (server time) */
  eventTime: Date;

  /** ID của actor thực hiện hành động (có thể null nếu hệ thống tự thực hiện) */
  actorId?: string;

  /** Mã nhân viên / học viên của actor */
  actorCode?: string;

  /** Role của actor tại thời điểm thực hiện */
  actorRole?: string;

  /** IP address của actor */
  actorIp?: string;

  /** User-Agent của actor */
  actorAgent?: string;

  /** Hành động — format: 'DOMAIN:event' */
  action: string;

  /** Loại entity bị tác động (ví dụ: 'user', 'class', 'enrollment') */
  entityType?: string;

  /** UUID của entity bị tác động */
  entityId?: string;

  /** Mã nghiệp vụ của entity (ví dụ: mã lớp, mã phiếu thu) */
  entityCode?: string;

  /** Giá trị cũ trước khi thay đổi (JSON) */
  oldValues?: Record<string, unknown>;

  /** Giá trị mới sau khi thay đổi (JSON) */
  newValues?: Record<string, unknown>;

  /** Chỉ các fields thực sự thay đổi (diff giữa oldValues và newValues) */
  diff?: Record<string, unknown>;

  /** Mô tả ngắn về sự kiện */
  description?: string;

  /** Dữ liệu bổ sung tuỳ ý */
  metadata?: Record<string, unknown>;

  /** Request ID để trace qua nhiều log entries */
  requestId?: string;
}
