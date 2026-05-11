/**
 * Danh sách lớp sắp khai giảng (public) — Q12, OVERVIEW §10.1.
 *
 * Cách vận hành:
 * - Trả về các lớp đã `announced` + điều kiện “upcoming” trong `classRepo.findAnnouncedUpcoming()` (phụ huynh xem lịch, ca, phòng, tiến độ sĩ số ở FE).
 */
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';

export class ListUpcomingClassesUseCase {
  constructor(private readonly classRepo: IClassRepo) {}

  async execute() {
    return this.classRepo.findAnnouncedUpcoming();
  }
}
