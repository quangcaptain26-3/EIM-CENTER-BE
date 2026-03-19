import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";
import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";

export class ListStudentEnrollmentsUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly studentRepo: StudentRepoPort
  ) {}

  async execute(studentId: string) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw AppError.notFound(`Không tìm thấy học viên với ID: ${studentId}`);
    }

    const enrollments = await this.enrollmentRepo.listByStudent(studentId);
    return enrollments.map(StudentsMapper.toEnrollmentResponse);
  }
}
