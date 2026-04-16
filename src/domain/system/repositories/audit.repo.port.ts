import { AuditLogEntity } from '../entities/audit-log.entity';
import { PagedResult } from '../../../shared/types/common.types';

/** Filter params cho findAll */
export interface AuditLogFilter {
  /** Lọc theo actor UUID */
  actorId?: string;

  /** Lọc chính xác theo action (ví dụ: 'AUTH:login') */
  action?: string;

  /**
   * Lọc theo prefix của action (wildcard suffix).
   * Ví dụ: 'AUTH:*' → khớp tất cả action bắt đầu bằng 'AUTH:'
   */
  actionPrefix?: string;

  /** Lọc theo entityType */
  entityType?: string;

  /** Lọc theo entityCode */
  entityCode?: string;

  /** Lọc từ ngày (inclusive) */
  dateFrom?: Date;

  /** Lọc đến ngày (inclusive) */
  dateTo?: Date;

  /**
   * Full-text search trong trường diff (JSONB cast to text, ILIKE).
   * Dùng để tìm nhanh các thay đổi chứa giá trị cụ thể.
   */
  diffSearch?: string;

  /** Trang hiện tại (1-based) */
  page: number;

  /** Số bản ghi mỗi trang */
  limit: number;
}

export interface IAuditRepo {
  /**
   * Ghi một bản ghi audit log mới.
   *
   * Fire-and-forget: caller không cần await kết quả, implementation
   * phải đảm bảo KHÔNG throw dù có lỗi SQL hay bất kỳ lỗi nào.
   */
  create(data: Omit<AuditLogEntity, 'id' | 'eventTime'>): Promise<void>;

  /**
   * Lấy danh sách audit logs với filter động và phân trang.
   * Chỉ dành cho ADMIN xem qua ListAuditLogsUseCase.
   */
  findAll(filter: AuditLogFilter): Promise<PagedResult<AuditLogEntity>>;
}
