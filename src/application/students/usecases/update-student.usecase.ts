import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { UpdateStudentBody } from "../dtos/student.dto";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";

export class UpdateStudentUseCase {
  constructor(private readonly studentRepo: StudentRepoPort) {}

  async execute(id: string, input: UpdateStudentBody) {
    // Kiểm tra tồn tại
    const existing = await this.studentRepo.findById(id);
    if (!existing) {
      throw AppError.notFound(`Không tìm thấy học viên với ID: ${id}`);
    }

    const patch: any = { ...input };
    if (patch.dob) {
      patch.dob = new Date(patch.dob);
    }

    const updated = await this.studentRepo.update(id, patch);
    return StudentsMapper.toStudentResponse(updated);
  }
}
