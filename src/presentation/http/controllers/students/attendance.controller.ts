import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createAttendanceController(
  recordAttendanceUsecase: any,
  getAttendanceHistoryUsecase: any,
) {
  const actor = (req: Request) => ({
    id: (req as any).user.id,
    role: (req as any).user.role,
    ip: req.ip,
  });

  return {
    /** POST /sessions/:id/attendance */
    recordAttendance: async (req: Request, res: Response) => {
      try {
        const result = await recordAttendanceUsecase.execute(
          { sessionId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** GET /enrollments/:id/attendance */
    getAttendanceHistory: async (req: Request, res: Response) => {
      try {
        const result = await getAttendanceHistoryUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
