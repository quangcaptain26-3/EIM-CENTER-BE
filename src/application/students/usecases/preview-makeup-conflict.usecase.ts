/**
 * Xem trước xung đột khi đặt lịch học bù — Q16 (chọn ngày/giờ bù), OVERVIEW §7, đồng bộ với `CreateMakeupSessionUseCase`.
 *
 * Cách vận hành:
 * - FE gửi ngày + ca + `room_id` + `teacher_id`; gọi `ConflictCheckerService` cho phòng và GV độc lập → `canProceed` khi cả hai không conflict.
 * - Phải giữ khớp rule với bước tạo makeup thật (nếu sửa một nơi phải sửa cả hai).
 */
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { PreviewMakeupConflictQuerySchema } from '../dtos/attendance.dto';

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
