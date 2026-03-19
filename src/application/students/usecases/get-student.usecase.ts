import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";

export class GetStudentUseCase {
  constructor(private readonly studentRepo: StudentRepoPort) {}

  async execute(id: string) {
    const student = await this.studentRepo.findById(id);
    if (!student) {
      throw AppError.notFound(`Không tìm thấy học viên với ID: ${id}`);
    }
    return StudentsMapper.toStudentResponse(student);
  }
}
