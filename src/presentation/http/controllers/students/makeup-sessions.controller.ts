import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createMakeupSessionController(
  createMakeupSessionUsecase: any,
  completeMakeupSessionUsecase: any,
  listMakeupSessionsUsecase: any,
) {
  const actor = (req: Request) => ({
    id: (req as any).user.id,
    role: (req as any).user.role,
    ip: req.ip,
  });

  return {
    /** POST /makeup-sessions */
    createMakeup: async (req: Request, res: Response) => {
      try {
        const result = await createMakeupSessionUsecase.execute(req.body, actor(req));
        res.status(201).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** PATCH /makeup-sessions/:id/complete */
    completeMakeup: async (req: Request, res: Response) => {
      try {
        const result = await completeMakeupSessionUsecase.execute(
          { makeupSessionId: req.params.id },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** GET /makeup-sessions?status=&enrollmentId= */
    listMakeupSessions: async (req: Request, res: Response) => {
      try {
        const { status, enrollmentId } = req.query;
        const result = await listMakeupSessionsUsecase.execute({
          status: status as string | undefined,
          enrollmentId: enrollmentId as string | undefined,
        });
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
