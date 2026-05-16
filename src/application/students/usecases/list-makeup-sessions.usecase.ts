import { IMakeupSessionRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { MakeupSessionStatus } from '../../../domain/students/entities/makeup-session.entity';

export class ListMakeupSessionsUseCase {
  constructor(private readonly makeupSessionRepo: IMakeupSessionRepo) {}

  async execute(filter: { status?: string; enrollmentId?: string }) {
    return this.makeupSessionRepo.findMany({
      enrollmentId: filter.enrollmentId,
      status: filter.status as MakeupSessionStatus | undefined,
    });
  }
}
