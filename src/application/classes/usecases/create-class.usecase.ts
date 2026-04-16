import { IClassRepo, IClassStaffRepo, IProgramRepo, IRoomRepo } from '../../../domain/classes/repositories/class.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { CreateClassDto } from '../dtos/class.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CreateClassUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly classStaffRepo: IClassStaffRepo,
    private readonly programRepo: IProgramRepo,
    private readonly roomRepo: IRoomRepo,
    private readonly userRepo: any,
    private readonly conflictChecker: ConflictCheckerService,
    private readonly auditRepo: any // dependency to handle logs
  ) {}

  async execute(userId: string, actorRole: string, data: unknown) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN hoặc ACADEMIC mới tạo được lớp',
        403,
      );
    }

    const payload = CreateClassDto.parse(data);

    const program = await this.programRepo.findByCode(payload.programCode);
    if (!program || !program.isActive) {
      throw new AppError(ERROR_CODES.PROGRAM_NOT_FOUND, 'Chương trình không tồn tại hoặc không active', 404);
    }

    const room = await this.roomRepo.findById(payload.roomId);
    if (!room || !room.isActive) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Phòng không tồn tại hoặc không active', 404);
    }

    const teacher = await this.userRepo.findById(payload.teacherId);
    if (!teacher || teacher.role.code !== 'TEACHER' || !teacher.isActive) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Giáo viên không hợp lệ hoặc không active', 422);
    }

    const isTeacherConflict = await this.conflictChecker.checkTeacherConflict({
      teacherId: payload.teacherId,
      scheduleDays: payload.scheduleDays,
      shift: payload.shift
    });
    if (isTeacherConflict) {
      throw new AppError(ERROR_CODES.CLASS_TEACHER_CONFLICT, 'Trùng lịch giáo viên', 409);
    }

    const isRoomConflict = await this.conflictChecker.checkRoomConflict({
      roomId: payload.roomId,
      scheduleDays: payload.scheduleDays,
      shift: payload.shift
    });
    if (isRoomConflict) {
      throw new AppError(ERROR_CODES.CLASS_ROOM_CONFLICT, 'Trùng lịch phòng', 409);
    }

    // Generating Class Code
    const prefixMap: Record<string, string> = {
      'KINDY': 'LK', 'STARTERS': 'LS', 'MOVERS': 'LM', 'FLYERS': 'LF'
    };
    const codePrefix = `EIM-${prefixMap[payload.programCode] || 'UK'}`;
    const { total } = await this.classRepo.findAll({ programCode: payload.programCode }, { limit: 1, offset: 0 });
    const count = total + 1;
    const classCode = `${codePrefix}-${count.toString().padStart(2, '0')}`;

    const newClass = await this.classRepo.create({
      classCode,
      programId: program.id,
      roomId: payload.roomId,
      shift: payload.shift,
      scheduleDays: payload.scheduleDays,
      minCapacity: 5,
      maxCapacity: 12, // Configurable later
      status: 'pending',
      startDate: new Date(payload.startDate),
      createdBy: userId,
    });

    await this.classStaffRepo.create({
      classId: newClass.id,
      teacherId: payload.teacherId,
      effectiveFromSession: 1,
      assignedBy: userId,
    });

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:created', { classId: newClass.id, code: classCode, createdBy: userId });
    }

    return newClass;
  }
}
