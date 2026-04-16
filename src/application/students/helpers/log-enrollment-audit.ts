import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';

/** Actor từ HTTP (sau authenticate) — bổ sung userCode cho audit */
export type EnrollmentAuditActor = {
  id: string;
  role?: string;
  userCode?: string;
  ip?: string;
};

export async function logEnrollmentStatusAudit(
  auditLogRepo: IAuditLogRepo,
  params: {
    action:
      | 'ENROLLMENT:activated'
      | 'ENROLLMENT:paused'
      | 'ENROLLMENT:resumed'
      | 'ENROLLMENT:dropped'
      | 'ENROLLMENT:completed';
    enrollmentId: string;
    entityCode: string;
    oldStatus: string;
    newStatus: string;
    actor: EnrollmentAuditActor;
    description: string;
  },
): Promise<void> {
  await auditLogRepo.log({
    action: params.action,
    actorId: params.actor.id,
    actorCode: params.actor.userCode,
    actorRole: params.actor.role,
    actorIp: params.actor.ip,
    entityType: 'enrollment',
    entityId: params.enrollmentId,
    entityCode: params.entityCode,
    oldValues: { status: params.oldStatus },
    newValues: { status: params.newStatus },
    description: params.description,
  });
}
