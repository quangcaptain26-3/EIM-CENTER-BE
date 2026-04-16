import { Request, Response, NextFunction } from 'express';
import { ListAuditLogsUseCase, ListAuditLogsSchema } from '../../../../application/system/usecases/list-audit-logs.usecase';

/**
 * Audit Logs HTTP Controller
 *
 * GET /api/v1/audit-logs — chỉ ADMIN
 * Query params: actorId, action, actionPrefix, entityType, entityCode,
 *               dateFrom, dateTo, diffSearch, page, limit
 */
export function createAuditController(
  listAuditLogsUsecase: ListAuditLogsUseCase,
) {
  return {
    /** GET /audit-logs */
    listAuditLogs: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const actor = (req as any).user as { id: string; role: string };

        // Parse & coerce query params
        const dto = ListAuditLogsSchema.parse({
          actorId:      req.query.actorId,
          action:       req.query.action,
          actionPrefix: req.query.actionPrefix,
          entityType:   req.query.entityType,
          entityCode:   req.query.entityCode,
          dateFrom:     req.query.dateFrom,
          dateTo:       req.query.dateTo,
          diffSearch:   req.query.diffSearch,
          page:         req.query.page  ?? 1,
          limit:        req.query.limit ?? 20,
        });

        const result = await listAuditLogsUsecase.execute(dto, actor);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
