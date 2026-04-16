import { ClassRosterRow, IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';

export class GetRosterUseCase {
  constructor(private readonly enrollmentRepo: IEnrollmentRepo) {}

  async execute(classId: string): Promise<ClassRosterRow[]> {
    return this.enrollmentRepo.findRosterByClass(classId);
  }
}
