import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createClassController(
  createClassUsecase: any,
  getClassUsecase: any,
  updateClassUsecase: any,
  generateSessionsUsecase: any,
  replaceTeacherUsecase: any,
  closeClassUsecase: any,
  getRosterUsecase: any,
  listClassSessionsUsecase: any,
  listClassesUsecase: any
) {
  return {
    listClasses: async (req: Request, res: Response) => {
      try {
        const q = req.query;
        const limit = Math.min(Math.max(Number(q.limit) || 12, 1), 100);
        const page = Math.max(Number(q.page) || 1, 1);
        const offset =
          q.offset !== undefined ? Math.max(Number(q.offset) || 0, 0) : (page - 1) * limit;

        const programCode = typeof q.programCode === 'string' ? q.programCode : undefined;
        const programId = typeof q.programId === 'string' ? q.programId : undefined;
        const status = q.status as 'pending' | 'active' | 'closed' | undefined;
        const roomId = typeof q.roomId === 'string' ? q.roomId : undefined;
        const teacherId = typeof q.teacherId === 'string' ? q.teacherId : undefined;
        const search = typeof q.search === 'string' ? q.search.trim() : undefined;

        let shift: 1 | 2 | undefined;
        if (q.shift === 'SHIFT_1' || q.shift === '1') shift = 1;
        else if (q.shift === 'SHIFT_2' || q.shift === '2') shift = 2;

        const result = await listClassesUsecase.execute(
          {
            programCode,
            programId,
            status,
            roomId,
            teacherId,
            shift,
            search: search || undefined,
          },
          limit,
          offset,
        );
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    createClass: async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const result = await createClassUsecase.execute(userId, role, req.body);
        res.status(201).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    getClass: async (req: Request, res: Response) => {
      try {
        const result = await getClassUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    updateClass: async (req: Request, res: Response) => {
      try {
        const role = (req as any).user.role;
        const result = await updateClassUsecase.execute(role, req.params.id, req.body);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    generateSessions: async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const result = await generateSessionsUsecase.execute(userId, role, req.params.id);
        res.status(201).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    replaceTeacher: async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const { newTeacherId } = req.body;
        const result = await replaceTeacherUsecase.execute(userId, role, req.params.id, newTeacherId);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    closeClass: async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const result = await closeClassUsecase.execute(userId, req.params.id);
        res.status(200).json({ success: result });
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    getRoster: async (req: Request, res: Response) => {
      try {
        const result = await getRosterUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    listClassSessions: async (req: Request, res: Response) => {
      try {
        const result = await listClassSessionsUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    }
  };
}
