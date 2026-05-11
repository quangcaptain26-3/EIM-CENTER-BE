/**
 * Danh sách lớp có lọc (chương trình, trạng thái, phòng, GV, ca…) — màn quản lý lớp nội bộ, không thay cho `/upcoming` public.
 *
 * Cách vận hành:
 * - Ủy quyện `classRepo.findAll` với phân trang offset/limit.
 */
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';

export class ListClassesUseCase {
  constructor(private readonly classRepo: IClassRepo) {}

  async execute(
    filter: {
      programCode?: string;
      programId?: string;
      status?: 'pending' | 'active' | 'closed';
      roomId?: string;
      teacherId?: string;
      shift?: 1 | 2;
      search?: string;
    },
    limit: number = 10,
    offset: number = 0,
  ) {
    return await this.classRepo.findAll(filter, { limit, offset });
  }
}
