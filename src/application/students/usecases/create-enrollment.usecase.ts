import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { CreateEnrollmentBody } from "../dtos/enrollment.dto";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";

export class CreateEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly studentRepo: StudentRepoPort
  ) {}

  async execute(input: CreateEnrollmentBody, actorUserId?: string) {
    // 1. Validate student exists
    const student = await this.studentRepo.findById(input.studentId);
    if (!student) {
      throw AppError.notFound(`Không tìm thấy học viên với ID: ${input.studentId}`);
    }

    // TODO: Có thể validate classId tồn tại nếu có ClassRepoPort

    // 2. Tạo Enrollment, mặc định trạng thái ACTIVE
    const payload = {
      studentId: input.studentId,
      classId: input.classId ?? null,
      startDate: new Date(input.startDate),
      status: "ACTIVE" as const,
    };

    const enrollment = await this.enrollmentRepo.create(payload);

    // 3. Lưu history tối thiểu để giải thích vì sao enrollment được tạo (đặc biệt khi chưa xếp lớp).
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
