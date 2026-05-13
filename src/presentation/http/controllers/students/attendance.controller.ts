import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createAttendanceController(
  recordAttendanceUsecase: any,
  editAttendanceUsecase: any,
  getAttendanceHistoryUsecase: any,
  getSessionAttendanceStatusUsecase: any,
  getSessionAttendanceHistoryUsecase: any,
) {
  const actor = (req: Request) => ({
    id: (req as any).user.id,
    userCode: (req as any).user.userCode,
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

    /** PATCH /sessions/:id/attendance */
    editAttendance: async (req: Request, res: Response) => {
      try {
        const result = await editAttendanceUsecase.execute(
          { sessionId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** GET /sessions/:id/attendance-status */
    getAttendanceStatus: async (req: Request, res: Response) => {
      try {
        const result = await getSessionAttendanceStatusUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** GET /sessions/:id/attendance-history */
    getSessionAttendanceHistory: async (req: Request, res: Response) => {
      try {
        const result = await getSessionAttendanceHistoryUsecase.execute(req.params.id);
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
