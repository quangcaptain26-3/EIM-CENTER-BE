import type { Pool } from 'pg';
import { ensureRosterViewAccess } from '../guards/ensure-class-access-by-role';
import { ClassRosterRow, IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';

export class GetRosterUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly db: Pick<Pool, 'query'>,
  ) {}

  async execute(classId: string, actor: { id: string; role: string }): Promise<ClassRosterRow[]> {
    await ensureRosterViewAccess(this.db, actor, classId);
    return this.enrollmentRepo.findRosterByClass(classId);
  }
}
