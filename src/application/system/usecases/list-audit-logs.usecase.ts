import { AuditRepoPort } from "../../../domain/system/repositories/audit.repo.port";
import { ListAuditLogsQuery } from "../dtos/audit.dto";
import { mapAuditLog } from "../mappers/system.mapper";

/**
 * UseCase: Lấy danh sách audit log có phân trang.
 * Dành cho admin xem lịch sử hành động trong hệ thống.
 */
export class ListAuditLogsUseCase {
  constructor(private readonly auditRepo: AuditRepoPort) {}

  async execute(query: ListAuditLogsQuery) {
    const [logs, total] = await Promise.all([
      this.auditRepo.list({
        actorUserId: query.actorUserId,
        action:      query.action,
        fromDate:    query.fromDate,
        toDate:      query.toDate,
        limit:       query.limit,
        offset:      query.offset,
      }),
      this.auditRepo.count({
        actorUserId: query.actorUserId,
        action:      query.action,
        fromDate:    query.fromDate,
        toDate:      query.toDate,
      }),
    ]);

    // Trả về kết quả phân trang (PagedResult)
    return {
      items:  logs.map((l) => mapAuditLog(l)),
      total,
      limit:  query.limit,
      offset: query.offset,
    };
  }
}
