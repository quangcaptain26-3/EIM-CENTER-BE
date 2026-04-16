import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createProgramController(listProgramsUsecase: any) {
  return {
    listPrograms: async (req: Request, res: Response) => {
      try {
        const result = await listProgramsUsecase.execute();
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    }
  };
}
