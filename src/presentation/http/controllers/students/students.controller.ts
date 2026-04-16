import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

const ENROLLMENT_STATUS_FILTER = new Set([
  'pending',
  'trial',
  'active',
  'paused',
  'transferred',
  'dropped',
  'completed',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createStudentController(
  createStudentUsecase: any,
  listStudentsUsecase: any,
  getStudentUsecase: any,
  updateStudentUsecase: any,
) {
  return {
    /** GET /students */
    listStudents: async (req: Request, res: Response) => {
      try {
        const {
          search,
          programCode,
          programId,
          level,
          enrollmentStatus,
          classId,
          isActive,
          page,
          limit,
        } = req.query;

        const rawStatus = typeof enrollmentStatus === 'string' ? enrollmentStatus.trim().toLowerCase() : '';
        const safeEnrollmentStatus =
          rawStatus && ENROLLMENT_STATUS_FILTER.has(rawStatus) ? rawStatus : undefined;

        const rawProgramId = typeof programId === 'string' ? programId.trim() : '';
        const safeProgramId = UUID_RE.test(rawProgramId) ? rawProgramId : undefined;

        const result = await listStudentsUsecase.execute({
          search: search as string | undefined,
          programCode: programCode as string | undefined,
          programId: safeProgramId,
          level: typeof level === 'string' && level.trim() ? level.trim() : undefined,
          enrollmentStatus: safeEnrollmentStatus,
          classId: classId as string | undefined,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 20,
        });
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** POST /students */
    createStudent: async (req: Request, res: Response) => {
      try {
        const actor = {
          id: (req as any).user.id,
          role: (req as any).user.role,
          ip: req.ip,
        };
        const result = await createStudentUsecase.execute(req.body, actor);
        res.status(201).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** GET /students/:id */
    getStudent: async (req: Request, res: Response) => {
      try {
        const result = await getStudentUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    /** PATCH /students/:id */
    updateStudent: async (req: Request, res: Response) => {
      try {
        const actor = {
          id: (req as any).user.id,
          role: (req as any).user.role,
          ip: req.ip,
        };
        const result = await updateStudentUsecase.execute(
          req.params.id,
          req.body,
          actor,
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
