import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { IRoomRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export type RoomAvailabilityRow = {
  id: string;
  roomCode: string;
  capacity: number;
  floor: number | null;
  roomType: string;
  amenities: Record<string, unknown>;
  isAvailable: boolean;
  conflictClassCode?: string;
};

export class ListRoomAvailabilityUseCase {
  constructor(
    private readonly roomRepo: IRoomRepo,
    private readonly conflictChecker: ConflictCheckerService,
  ) {}

  async execute(query: {
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<{ data: RoomAvailabilityRow[] }> {
    const scheduleDays = query.scheduleDays;
    const shift = Number(query.shift);
    if (!scheduleDays.length || (shift !== 1 && shift !== 2)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'scheduleDays và shift (1 hoặc 2) là bắt buộc',
        400,
      );
    }

    const rooms = await this.roomRepo.findAll();
    const data: RoomAvailabilityRow[] = [];

    for (const room of rooms) {
      if (room.isActive === false) continue;
      const conflict = await this.conflictChecker.findRoomConflictDetail({
        roomId: room.id,
        scheduleDays,
        shift,
        excludeClassId: query.excludeClassId,
      });
      data.push({
        id: room.id,
        roomCode: room.roomCode,
        capacity: room.capacity,
        floor: room.floor ?? null,
        roomType: room.roomType ?? 'normal',
        amenities: (room.amenities as Record<string, unknown>) ?? {},
        isAvailable: !conflict,
        conflictClassCode: conflict?.classCode,
      });
    }

    return { data };
  }
}
