import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ClassStaffRepoPort } from "../../../domain/classes/repositories/class-staff.repo.port";
import { AssignStaffBody } from "../dtos/staff.dto";
import { ClassMapper } from "../mappers/classes.mapper";
import { AppError } from "../../../shared/errors/app-error";
import { UserRepoPort } from "../../../domain/auth/repositories/user.repo.port";

export class AssignStaffUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly classStaffRepo: ClassStaffRepoPort,
    private readonly userRepo: UserRepoPort
  ) {}

  async execute(classId: string, dto: AssignStaffBody) {
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw AppError.notFound(`Không tìm thấy lớp học với ID: ${classId}`);
    }

    // 1) Validate user tồn tại và có role TEACHER
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
        roles: authInfo.roles,
      });
    }

    // 2) Enforce mỗi class chỉ có 1 MAIN
    if (dto.type === "MAIN") {
      const staffList = await this.classStaffRepo.listStaff(classId);
      const currentMain = staffList.find((s) => s.type === "MAIN");

      // Nếu đã có MAIN khác thì chặn (để tránh overwrite âm thầm).
      if (currentMain && currentMain.userId !== dto.userId) {
        throw AppError.conflict("Lớp học đã có giáo viên MAIN. Vui lòng gỡ MAIN hiện tại trước khi gán mới.", {
          code: "CLASS_STAFF/MAIN_ALREADY_ASSIGNED",
          currentMainUserId: currentMain.userId,
        });
      }
    }

    const staff = await this.classStaffRepo.assignStaff(
      classId,
      dto.userId,
      dto.type
    );

    return ClassMapper.toStaffResponse(staff);
  }
}
