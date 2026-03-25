import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ClassStaffRepoPort } from "../../../domain/classes/repositories/class-staff.repo.port";
import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { UserRepoPort } from "../../../domain/auth/repositories/user.repo.port";
import { ChangeMainTeacherBody } from "../dtos/staff.dto";
import { ClassMapper } from "../mappers/classes.mapper";
import { AppError } from "../../../shared/errors/app-error";

/**
 * Đổi giáo viên chính (MAIN) dài hạn.
 * Phân biệt với cover teacher (ngắn hạn, theo từng buổi).
 *
 * Flow:
 * 1. Validate user mới có role TEACHER
 * 2. Remove MAIN cũ (nếu có và khác user)
 * 3. Assign MAIN mới vào class_staff
 * 4. Cập nhật main_teacher_id cho các buổi có session_date >= effectiveFrom
 *
 * Đảm bảo feedback ownership khớp: GV mới có quyền ghi từ buổi effectiveFrom.
 */
export class ChangeMainTeacherUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly classStaffRepo: ClassStaffRepoPort,
    private readonly sessionRepo: ISessionRepository,
    private readonly userRepo: UserRepoPort
  ) {}

  async execute(classId: string, dto: ChangeMainTeacherBody) {
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw AppError.notFound(`Không tìm thấy lớp học với ID: ${classId}`);
    }

    const authInfo = await this.userRepo.getUserAuthInfo(dto.userId);
    if (!authInfo) {
      throw AppError.badRequest("Không tìm thấy giáo viên để phân công", {
        code: "CLASS_STAFF/TEACHER_NOT_FOUND",
        userId: dto.userId,
      });
    }
    if (!authInfo.roles.includes("TEACHER")) {
      throw AppError.badRequest("Chỉ được phân công user có role TEACHER vào lớp", {
        code: "CLASS_STAFF/ROLE_NOT_TEACHER",
        userId: dto.userId,
      });
    }

    const effectiveFrom = dto.effectiveFrom
      ? (() => {
          const d = new Date(dto.effectiveFrom);
          d.setHours(0, 0, 0, 0);
          if (Number.isNaN(d.getTime())) {
            throw AppError.badRequest("effectiveFrom không hợp lệ (YYYY-MM-DD)");
          }
          return d;
        })()
      : new Date();
    effectiveFrom.setHours(0, 0, 0, 0);

    const staffList = await this.classStaffRepo.listStaff(classId);
    const currentMain = staffList.find((s) => s.type === "MAIN");

    if (currentMain?.userId === dto.userId) {
      // Cùng user: chỉ cập nhật sessions nếu có thay đổi effectiveFrom (trường hợp hiếm)
      const updated = await this.sessionRepo.updateMainTeacherForSessionsFromDate(
        classId,
        effectiveFrom,
        dto.userId
      );
      return {
        staff: ClassMapper.toStaffResponse(currentMain),
        sessionsUpdated: updated,
        message: "Giáo viên chính không đổi; đã cập nhật phạm vi buổi hiệu lực (nếu có)",
      };
    }

    // Remove MAIN cũ trước (để tránh vi phạm unique constraint)
    if (currentMain) {
      await this.classStaffRepo.removeStaff(classId, currentMain.userId, "MAIN");
    }

    const staff = await this.classStaffRepo.assignStaff(classId, dto.userId, "MAIN");
    const sessionsUpdated = await this.sessionRepo.updateMainTeacherForSessionsFromDate(
      classId,
      effectiveFrom,
      dto.userId
    );

    return {
      staff: ClassMapper.toStaffResponse(staff),
      sessionsUpdated,
    };
  }
}
