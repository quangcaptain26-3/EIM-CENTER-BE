import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createProgramController(
  listProgramsUsecase: { execute: () => Promise<unknown> },
  updateProgramDefaultFeeUsecase: {
    execute: (programId: string, data: unknown, actor: { id: string; role: string; ip?: string }) => Promise<unknown>;
  },
) {
  return {
    listPrograms: async (req: Request, res: Response) => {
      try {
        const result = await listProgramsUsecase.execute();
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    updateDefaultFee: async (req: Request, res: Response) => {
      try {
        const user = (req as Request & { user: { id: string; role: string } }).user;
        const programId = String(req.params.programId ?? '');
        const result = await updateProgramDefaultFeeUsecase.execute(programId, req.body, {
          id: user.id,
          role: user.role,
          ip: req.ip,
        });
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
