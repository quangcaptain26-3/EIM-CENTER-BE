import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

export function createRoomController(listRoomsUsecase: any) {
  return {
    listRooms: async (req: Request, res: Response) => {
      try {
        const result = await listRoomsUsecase.execute();
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    }
  };
}
