import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { CreateEnrollmentBody } from "../dtos/enrollment.dto";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";
import type { EnrollmentEligibilityService } from "../services/enrollment-eligibility.service";

export class CreateEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly studentRepo: StudentRepoPort,
    private readonly classRepo: ClassRepoPort,
    private readonly eligibilityService: EnrollmentEligibilityService,
  ) {}

  async execute(input: CreateEnrollmentBody, actorUserId?: string) {
    // 1. Validate student exists
    const student = await this.studentRepo.findById(input.studentId);
    if (!student) {
      throw AppError.notFound(`Không tìm thấy học viên với ID: ${input.studentId}`);
    }

    // R4: Chặn nếu học viên còn nợ quá hạn
    const hasOverdue = await this.eligibilityService.studentHasOverdue(input.studentId);
    if (hasOverdue) {
      throw AppError.badRequest(
        "Học viên có hóa đơn quá hạn chưa thanh toán. Vui lòng xử lý nợ trước khi tạo enrollment mới.",
        { code: "ENROLLMENT_BLOCKED_OVERDUE", studentId: input.studentId },
      );
    }

    // R5: Chặn parallel enrollment — 1 học sinh chỉ 1 enrollment ACTIVE/PAUSED
    const existingEnrollments = await this.enrollmentRepo.listByStudent(input.studentId);
    const hasActive = existingEnrollments.some((e) => e.status === "ACTIVE" || e.status === "PAUSED");
    if (hasActive) {
      throw AppError.badRequest(
        "Học viên đã có lớp đang học. Vui lòng chuyển lớp hoặc kết thúc lớp hiện tại trước khi tạo enrollment mới.",
        { code: "ENROLLMENT_ONE_ACTIVE_PER_STUDENT", studentId: input.studentId },
      );
    }

    // 2. Resolve classId: ưu tiên class_code (mã lớp thân thiện) để người dùng không nhập UUID
    let classId: string | null = input.classId ?? null;
    if (input.class_code?.trim()) {
      const cls = await this.classRepo.findByCode(input.class_code.trim());
      if (!cls) {
        throw AppError.notFound(`Không tìm thấy lớp học với mã: ${input.class_code.trim()}`);
      }
      classId = cls.id;
    }

    // 3. Tạo Enrollment, mặc định trạng thái ACTIVE
    const payload = {
      studentId: input.studentId,
      classId,
      startDate: new Date(input.startDate),
      status: "ACTIVE" as const,
    };

    const enrollment = await this.enrollmentRepo.create(payload);

    // 4. Lưu history tối thiểu để giải thích vì sao enrollment được tạo (đặc biệt khi chưa xếp lớp).
    // Lưu ý: fromStatus/toStatus đều là ACTIVE vì đây là hành động "tạo mới", không phải chuyển trạng thái.
    await this.enrollmentRepo.createHistory(
      enrollment.id,
      "ACTIVE",
      "ACTIVE",
      enrollment.classId
        ? "Tạo mới enrollment và xếp lớp ngay"
        : "Tạo mới enrollment (chưa xếp lớp)",
      {
        changedBy: actorUserId ?? null,
        fromClassId: null,
        toClassId: enrollment.classId,
      }
    );

    return StudentsMapper.toEnrollmentResponse(enrollment);
  }
}
