import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createEnrollmentController(
  createEnrollmentUsecase: any,
  startTrialUsecase: any,
  activateEnrollmentUsecase: any,
  dropEnrollmentUsecase: any,
  completeEnrollmentUsecase: any,
  pauseEnrollmentUsecase: any,
  getResumeOptionsUsecase: any,
  resumeEnrollmentUsecase: any,
  transferClassUsecase: any,
  transferEnrollmentUsecase: any,
  upgradeProgramUsecase: any,
  listEnrollmentsUsecase: any,
  resetMakeupBlockedUsecase: any,
  cancelReservationUsecase: any,
  reassignReservedClassUsecase: any,
  transferReservationUsecase: any,
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
          req.params.id,
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
        const result = await completeEnrollmentUsecase.execute(req.params.id, req.body ?? {}, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/pause */
    pauseEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await pauseEnrollmentUsecase.execute(
          { reason: req.body.reason, enrollmentId: req.params.id },
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

    /** GET /enrollments/:id/resume-options */
    getResumeOptions: async (req: Request, res: Response) => {
      try {
        const result = await getResumeOptionsUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/resume */
    resumeEnrollment: async (req: Request, res: Response) => {
      try {
        const result = await resumeEnrollmentUsecase.execute(req.params.id, req.body ?? {}, actor(req));
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

    /** POST /enrollments/:id/upgrade-program */
    upgradeProgram: async (req: Request, res: Response) => {
      try {
        const result = await upgradeProgramUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/reset-makeup-blocked — Q15, chỉ ADMIN */
    resetMakeupBlocked: async (req: Request, res: Response) => {
      try {
        const result = await resetMakeupBlockedUsecase.execute(req.params.id, req.body, actor(req));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/cancel-reservation — Q39 */
    cancelReservation: async (req: Request, res: Response) => {
      try {
        const result = await cancelReservationUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/reassign-reserved-class — Q37 */
    reassignReservedClass: async (req: Request, res: Response) => {
      try {
        const result = await reassignReservedClassUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /enrollments/:id/transfer-reservation — Q38 */
    transferReservation: async (req: Request, res: Response) => {
      try {
        const result = await transferReservationUsecase.execute(
          { enrollmentId: req.params.id, ...req.body },
          actor(req),
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
