import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { PreviewMakeupConflictQuerySchema } from '../dtos/attendance.dto';

/**
 * Xem trước xung đột lịch khi đặt học bù (ngày + ca + phòng + GV).
 * Logic trùng lịch phải khớp CreateMakeupSessionUseCase — nếu đổi rule: sửa ConflictCheckerService và use case tạo học bù cùng lúc.
 */
export class PreviewMakeupConflictUseCase {
  constructor(private readonly conflictChecker: ConflictCheckerService) {}

  async execute(raw: unknown) {
    const q = PreviewMakeupConflictQuerySchema.parse(raw);
    const date = new Date(q.makeupDate);
    const [room, teacher] = await Promise.all([
      this.conflictChecker.checkRoomConflictByDateWithDetail({
        roomId: q.roomId,
        date,
        shift: q.shift,
      }),
      this.conflictChecker.checkTeacherConflictByDateWithDetail({
        teacherId: q.teacherId,
        date,
        shift: q.shift,
      }),
    ]);
    return {
      data: {
        room,
        teacher,
        canProceed: !room.hasConflict && !teacher.hasConflict,
      },
    };
  }
}
