import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createRefundRequestController(
  createRefundRequestUsecase: any,
  reviewRefundRequestUsecase: any,
  listRefundRequestsUsecase: any,
) {
  const actor = (req: Request) => ({
    id: (req as any).user.id,
    role: (req as any).user.role,
    userCode: (req as any).user.userCode,
    ip: req.ip,
  });

  return {
    /** POST /refund-requests */
    createRefund: async (req: Request, res: Response) => {
      try {
        const result = await createRefundRequestUsecase.execute(req.body, actor(req));
        res.status(201).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** GET /refund-requests?status=&reasonType=&page=&limit= */
    listRefunds: async (req: Request, res: Response) => {
      try {
        const { status, reasonType, page, limit } = req.query;
        const result = await listRefundRequestsUsecase.execute(
          {
            status: status as string | undefined,
            reasonType: reasonType as string | undefined,
          },
          {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
          },
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** PATCH /refund-requests/:id/approve */
    approveRefund: async (req: Request, res: Response) => {
      try {
        const result = await reviewRefundRequestUsecase.execute(
          {
            requestId: req.params.id,
            status: 'approved',
            reviewNote: req.body.reviewNote ?? '',
          },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** PATCH /refund-requests/:id/reject */
    rejectRefund: async (req: Request, res: Response) => {
      try {
        const result = await reviewRefundRequestUsecase.execute(
          {
            requestId: req.params.id,
            status: 'rejected',
            reviewNote: req.body.reviewNote,
          },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
