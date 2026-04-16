import { IClassRepo, IClassStaffRepo } from '../../../domain/classes/repositories/class.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { UpdateClassDto } from '../dtos/class.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class UpdateClassUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly classStaffRepo: IClassStaffRepo,
    private readonly conflictChecker: ConflictCheckerService,
  ) {}

  async execute(actorRole: string, classId: string, data: unknown) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN hoặc ACADEMIC mới cập nhật được lớp',
        403,
      );
    }

    const payload = UpdateClassDto.parse(data);

    const targetClass = await this.classRepo.findById(classId);
    if (!targetClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }
    if (targetClass.status !== 'pending') {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Chỉ cập nhật được lớp đang pending', 422);
    }

    if (payload.teacherId || payload.roomId || payload.scheduleDays || payload.shift) {
      const shiftToCheck = payload.shift ?? targetClass.shift;
      const daysToCheck = payload.scheduleDays ?? targetClass.scheduleDays;

      if (payload.teacherId || payload.scheduleDays || payload.shift) {
        let teacherIdToCheck = payload.teacherId;
        if (!teacherIdToCheck) {
          const staffList = await this.classStaffRepo.findActiveByClass(classId);
          const main = staffList[0];
          teacherIdToCheck = main?.teacher_id ?? main?.teacherId;
        }
        if (teacherIdToCheck) {
          const isTeacherConflict = await this.conflictChecker.checkTeacherConflict({
            teacherId: teacherIdToCheck,
            scheduleDays: daysToCheck,
            shift: shiftToCheck,
            excludeClassId: targetClass.id,
          });
          if (isTeacherConflict) {
            throw new AppError(ERROR_CODES.CLASS_TEACHER_CONFLICT, 'Trùng lịch giáo viên', 409);
          }
        }
      }

      if (payload.roomId || payload.scheduleDays || payload.shift) {
        const roomIdToCheck = payload.roomId ?? targetClass.roomId;
        const isConflict = await this.conflictChecker.checkRoomConflict({
          roomId: roomIdToCheck,
          shift: shiftToCheck,
          scheduleDays: daysToCheck,
          excludeClassId: targetClass.id,
        });
        if (isConflict) {
          throw new AppError(ERROR_CODES.CLASS_ROOM_CONFLICT, 'Trùng lịch phòng', 409);
        }
      }
    }

    return await this.classRepo.update(classId, payload);
  }
}
