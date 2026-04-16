import { Pool } from 'pg';
import { IAuditRepo, AuditLogFilter } from '../../../../domain/system/repositories/audit.repo.port';
import { AuditLogEntity } from '../../../../domain/system/entities/audit-log.entity';
import { PagedResult } from '../../../../shared/types/common.types';

/**
 * AuditPgRepo — PostgreSQL implementation của IAuditRepo.
 *
 * create():  INSERT đơn giản — không có ON CONFLICT.
 * findAll(): Dynamic WHERE clauses với parameterized queries.
 *            actionPrefix: action LIKE $prefix || '%'
 *            diffSearch:   diff::text ILIKE '%' || $search || '%'
 */
export class AuditPgRepo implements IAuditRepo {
  constructor(private readonly pool: Pool) {}

  /**
   * Ghi một audit log.
   * Phải đảm bảo KHÔNG throw dù lỗi SQL — caller fire-and-forget.
   */
  async create(data: Omit<AuditLogEntity, 'id' | 'eventTime'>): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO audit_logs (
          actor_id, actor_code, actor_role, actor_ip, actor_agent,
          action, entity_type, entity_id, entity_code,
          old_values, new_values, diff, description, metadata, request_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15
        )`,
        [
          data.actorId    ?? null,
          data.actorCode  ?? null,
          data.actorRole  ?? null,
          data.actorIp    ?? null,
          data.actorAgent ?? null,
          data.action,
          data.entityType ?? null,
          data.entityId   ?? null,
          data.entityCode ?? null,
          data.oldValues  ? JSON.stringify(data.oldValues)  : null,
          data.newValues  ? JSON.stringify(data.newValues)  : null,
          data.diff       ? JSON.stringify(data.diff)       : null,
          data.description ?? null,
          data.metadata   ? JSON.stringify(data.metadata)   : null,
          data.requestId  ?? null,
        ],
      );
    } catch (err) {
      // Fire-and-forget: tuyệt đối không throw
      console.error('[AuditPgRepo] Failed to insert audit log:', err);
    }
  }

  async findAll(filter: AuditLogFilter): Promise<PagedResult<AuditLogEntity>> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    let idx = 1;

    // ── Filter clauses ────────────────────────────────────────────────────────

    if (filter.actorId) {
      conditions.push(`actor_id = $${idx++}`);
      params.push(filter.actorId);
    }

    if (filter.action) {
      conditions.push(`action = $${idx++}`);
      params.push(filter.action);
    }

    if (filter.actionPrefix) {
      // 'AUTH:*' → action LIKE 'AUTH:%'
      // Loại bỏ suffix '*' nếu có, sau đó LIKE prefix%
      const prefix = filter.actionPrefix.replace(/\*$/, '');
      conditions.push(`action LIKE $${idx++} || '%'`);
      params.push(prefix);
    }

    if (filter.entityType) {
      conditions.push(`entity_type = $${idx++}`);
      params.push(filter.entityType);
    }

    if (filter.entityCode) {
      conditions.push(`entity_code = $${idx++}`);
      params.push(filter.entityCode);
    }

    if (filter.dateFrom) {
      conditions.push(`event_time >= $${idx++}`);
      params.push(filter.dateFrom);
    }

    if (filter.dateTo) {
      // Bao gồm toàn bộ ngày dateTo (đến cuối ngày)
      conditions.push(`event_time < $${idx++}::date + interval '1 day'`);
      params.push(filter.dateTo);
    }

    if (filter.diffSearch) {
      // full-text search trong JSONB diff field
      conditions.push(`diff::text ILIKE '%' || $${idx++} || '%'`);
      params.push(filter.diffSearch);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // ── Pagination ────────────────────────────────────────────────────────────
    const page  = Math.max(1, filter.page);
    const limit = Math.min(200, Math.max(1, filter.limit));
    const offset = (page - 1) * limit;

    // ── Count query ───────────────────────────────────────────────────────────
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM audit_logs ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    // ── Data query ────────────────────────────────────────────────────────────
    const dataResult = await this.pool.query<{
      id: string;
      event_time: Date;
      actor_id: string | null;
      actor_code: string | null;
      actor_role: string | null;
      actor_ip: string | null;
      actor_agent: string | null;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      entity_code: string | null;
      old_values: unknown;
      new_values: unknown;
      diff: unknown;
      description: string | null;
      metadata: unknown;
      request_id: string | null;
    }>(
      `SELECT
        id, event_time, actor_id, actor_code, actor_role, actor_ip, actor_agent,
        action, entity_type, entity_id, entity_code,
        old_values, new_values, diff, description, metadata, request_id
       FROM audit_logs
       ${whereClause}
       ORDER BY event_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    const data: AuditLogEntity[] = dataResult.rows.map((r) => ({
      id:          r.id,
      eventTime:   r.event_time,
      actorId:     r.actor_id   ?? undefined,
      actorCode:   r.actor_code ?? undefined,
      actorRole:   r.actor_role ?? undefined,
      actorIp:     r.actor_ip   ?? undefined,
      actorAgent:  r.actor_agent ?? undefined,
      action:      r.action,
      entityType:  r.entity_type  ?? undefined,
      entityId:    r.entity_id    ?? undefined,
      entityCode:  r.entity_code  ?? undefined,
      oldValues:   r.old_values   as Record<string, unknown> | undefined,
      newValues:   r.new_values   as Record<string, unknown> | undefined,
      diff:        r.diff         as Record<string, unknown> | undefined,
      description: r.description  ?? undefined,
      metadata:    r.metadata     as Record<string, unknown> | undefined,
      requestId:   r.request_id   ?? undefined,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
