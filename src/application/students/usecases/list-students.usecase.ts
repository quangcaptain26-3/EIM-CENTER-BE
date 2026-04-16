import { IStudentRepo } from '../../../domain/students/repositories/student.repo.port';

export class ListStudentsUseCase {
  constructor(private readonly studentRepo: IStudentRepo) {}

  async execute(params: {
    search?: string;
    programCode?: string;
    programId?: string;
    level?: string;
    enrollmentStatus?: string;
    classId?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }) {
    return this.studentRepo.findAll(params);
  }
}
