import type { Pool, PoolClient } from 'pg';
import { IAuditLogRepo } from '../../../../domain/auth/repositories/audit-log.repo.port';

export class AuditLogPgRepo implements IAuditLogRepo {
  constructor(private readonly pool: Pool | PoolClient) {}

  async log(data: {
    action: string;
    actorId?: string;
    actorCode?: string;
    actorRole?: string;
    actorIp?: string;
    actorAgent?: string;
    entityType?: string;
    entityId?: string;
    entityCode?: string;
    oldValues?: any;
    newValues?: any;
    diff?: any;
    description?: string;
  }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO audit_logs (
          actor_id, actor_code, actor_role, actor_ip, actor_agent,
          action, entity_type, entity_id, entity_code,
          old_values, new_values, diff, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          data.actorId ?? null,
          data.actorCode ?? null,
          data.actorRole ?? null,
          data.actorIp ?? null,
          data.actorAgent ?? null,
          data.action,
          data.entityType ?? null,
          data.entityId ?? null,
          data.entityCode ?? null,
          data.oldValues ? JSON.stringify(data.oldValues) : null,
          data.newValues ? JSON.stringify(data.newValues) : null,
          data.diff ? JSON.stringify(data.diff) : null,
          data.description ?? null,
        ],
      );
    } catch (err) {
      console.error('[AuditLogPgRepo] Failed to insert audit log:', err);
    }
  }
}
