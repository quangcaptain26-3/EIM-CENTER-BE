export interface IAuditLogRepo {
  log(data: {
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
  }): Promise<void>;
}
