import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';
import type { ListRoomAvailabilityUseCase } from '../../../../application/classes/usecases/list-room-availability.usecase';

function parseScheduleDays(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((d) => Number(d)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 8);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 8);
  }
  return [];
}

export function createRoomController(
  listRoomsUsecase: { execute: () => Promise<unknown> },
  listRoomAvailabilityUsecase: ListRoomAvailabilityUseCase,
) {
  return {
    listRooms: async (req: Request, res: Response) => {
      try {
        const result = await listRoomsUsecase.execute();
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },

    listRoomAvailability: async (req: Request, res: Response) => {
      try {
        const scheduleDays = parseScheduleDays(req.query.scheduleDays);
        const shift = Number(req.query.shift);
        const excludeClassId =
          typeof req.query.excludeClassId === 'string' && req.query.excludeClassId.trim()
            ? req.query.excludeClassId.trim()
            : undefined;
        const result = await listRoomAvailabilityUsecase.execute({
          scheduleDays,
          shift,
          excludeClassId,
        });
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
