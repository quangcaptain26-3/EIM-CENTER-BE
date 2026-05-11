import { IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class GetStudentUseCase {
  constructor(private readonly studentRepo: IStudentRepo) {}

  async execute(id: string) {
    const student = await this.studentRepo.findById(id);
    if (!student) {
      throw new AppError(ERROR_CODES.STUDENT_NOT_FOUND, 'Không tìm thấy học viên', 404);
    }
    return student;
  }
}
