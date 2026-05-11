import { IAuditRepo, AuditLogFilter } from '../../../domain/system/repositories/audit.repo.port';
import { AuditLogEntity } from '../../../domain/system/entities/audit-log.entity';
import { PagedResult } from '../../../shared/types/common.types';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { z } from 'zod';

// ─── DTO / Validation ─────────────────────────────────────────────────────────

export const ListAuditLogsSchema = z.object({
  actorId:      z.string().uuid('actorId phải là UUID').optional(),
  domain:       z.enum(['AUTH', 'USER', 'CLASS', 'ENROLLMENT', 'ATTENDANCE', 'FINANCE', 'STAFF', 'SYSTEM']).optional(),
  actorCode:    z.string().min(1).optional(),
  action:       z.string().min(1).optional(),
  actionPrefix: z.string().min(1).optional(),
  entityType:   z.string().min(1).optional(),
  entityCode:   z.string().min(1).optional(),
  dateFrom:     z.coerce.date().optional(),
  dateTo:       z.coerce.date().optional(),
  diffSearch:   z.string().min(1).optional(),
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().positive().max(200).default(20),
});

export type ListAuditLogsDto = z.infer<typeof ListAuditLogsSchema>;

// ─── Use Case ─────────────────────────────────────────────────────────────────

/**
 * ListAuditLogsUseCase — liệt kê audit logs với filter đầy đủ.
 *
 * Chỉ ADMIN mới được phép truy cập.
 * Hỗ trợ filter: domain, actor_code, entity_code, date range, diff search.
 * (Giữ backward compatible với action/actionPrefix/entityType/actorId)
 */
export class ListAuditLogsUseCase {
  constructor(private readonly auditRepo: IAuditRepo) {}

  async execute(
    dto: ListAuditLogsDto,
    actor: { role: string },
  ): Promise<PagedResult<AuditLogEntity>> {
    // Chỉ ADMIN được xem audit log
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN mới được xem audit logs',
        403,
      );
    }

    // Validate + parse input
    const params = ListAuditLogsSchema.parse(dto);

    // Build filter
    const actionPrefixFromDomain = params.domain ? `${params.domain}:*` : undefined;
    const filter: AuditLogFilter = {
      actorId:      params.actorId,
      actorCode:    params.actorCode,
      action:       params.action,
      actionPrefix: actionPrefixFromDomain ?? params.actionPrefix,
      entityType:   params.entityType,
      entityCode:   params.entityCode,
      dateFrom:     params.dateFrom,
      dateTo:       params.dateTo,
      diffSearch:   params.diffSearch,
      page:         params.page,
      limit:        params.limit,
    };

    return this.auditRepo.findAll(filter);
  }
}
