import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { toUserResponse } from '../mappers/auth.mapper';
import { buildPaginationParams } from '../../../shared/utils/pagination.util';

export class ListUsersUseCase {
  constructor(private readonly userRepo: IUserRepo) {}

  async execute(query: {
    roleCode?: string;
    /** Alias FE hay gửi (vd. ?role=ADMIN) */
    role?: string;
    isActive?: string;
    q?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit } = buildPaginationParams({
      page: query.page,
      limit: query.limit,
    });

    let isActive: boolean | undefined;
    if (query.isActive === 'true') isActive = true;
    else if (query.isActive === 'false') isActive = false;

    const roleCode = query.roleCode ?? query.role;

    const result = await this.userRepo.findAll({
      roleCode,
      isActive,
      search: query.q,
      page,
      limit,
    });

    return {
      data: result.data.map(toUserResponse),
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }
}
