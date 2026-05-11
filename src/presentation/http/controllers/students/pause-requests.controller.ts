import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createPauseRequestController(
  reviewPauseRequestUsecase: any,
  listPauseRequestsUsecase: any,
) {
  const actor = (req: Request) => ({
    id: (req as any).user.id,
    role: (req as any).user.role,
    ip: req.ip,
  });

  return {
    /** GET /pause-requests?status=pending|approved|rejected */
    listPending: async (req: Request, res: Response) => {
      try {
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const raw = req.query.status != null ? String(req.query.status) : 'pending';
        const status = ['pending', 'approved', 'rejected'].includes(raw) ? raw : 'pending';
        const result = await listPauseRequestsUsecase.execute({ page, limit, status }, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** PATCH /pause-requests/:id/approve */
    approve: async (req: Request, res: Response) => {
      try {
        const result = await reviewPauseRequestUsecase.execute(
          { requestId: req.params.id, status: 'approved', reviewNote: req.body?.reviewNote },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** PATCH /pause-requests/:id/reject */
    reject: async (req: Request, res: Response) => {
      try {
        const result = await reviewPauseRequestUsecase.execute(
          { requestId: req.params.id, status: 'rejected', reviewNote: req.body.reviewNote },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
