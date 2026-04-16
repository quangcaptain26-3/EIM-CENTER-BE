import { IMakeupSessionRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { MakeupSessionStatus } from '../../../domain/students/entities/makeup-session.entity';

export class ListMakeupSessionsUseCase {
  constructor(private readonly makeupSessionRepo: IMakeupSessionRepo) {}

  async execute(filter: { status?: string; enrollmentId?: string }) {
    if (filter.enrollmentId) {
      const all = await this.makeupSessionRepo.findByEnrollment(filter.enrollmentId);
      if (filter.status) {
        return all.filter((m) => m.status === (filter.status as MakeupSessionStatus));
      }
      return all;
    }
    // No enrollmentId — not supported by base repo; return empty (caller should filter)
    return [];
  }
}
