import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createEnrollmentController(
  createEnrollmentUsecase: any,
  startTrialUsecase: any,
  activateEnrollmentUsecase: any,
  dropEnrollmentUsecase: any,
  completeEnrollmentUsecase: any,
  pauseEnrollmentUsecase: any,
  resumeEnrollmentUsecase: any,
  transferClassUsecase: any,
  transferEnrollmentUsecase: any,
  listEnrollmentsUsecase: any,
) {
  /** Helper: build actor from request */
  const actor = (req: Request) => ({
    id: (req as any).user.id,
    role: (req as any).user.role,
    userCode: (req as any).user.userCode,
    ip: req.ip,
  });

  return {
    /** GET /students/:id/enrollments */
    listStudentEnrollments: async (req: Request, res: Response) => {
      try {
        const result = await listEnrollmentsUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments */
    createEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await createEnrollmentUsecase.execute(req.body, actor(req));
        res.status(201).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/start-trial */
    startTrial: async (req: Request, res: Response) => {
      try {
        const result = await startTrialUsecase.execute(
          { enrollmentId: req.params.id },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/activate */
    activateEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await activateEnrollmentUsecase.execute(req.params.id, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/drop */
    dropEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await dropEnrollmentUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/complete */
    completeEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await completeEnrollmentUsecase.execute(req.params.id, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/pause */
    pauseEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await pauseEnrollmentUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        if ((result as { requiresApproval: boolean }).requiresApproval) {
          return res.status(201).json(result);
        }
        return res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/resume */
    resumeEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await resumeEnrollmentUsecase.execute(req.params.id, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/transfer-class */
    transferClass: async (req: Request, res: Response) => {
      try {
        const result = await transferClassUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/transfer  (transfer tuition between students) */
    transferEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await transferEnrollmentUsecase.execute(req.body, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
