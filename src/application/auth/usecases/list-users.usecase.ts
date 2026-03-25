import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AuthMapper } from '../mappers/auth.mapper';
import { ListUsersQueryDto } from '../dtos/user-management.dto';

export class ListUsersUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(query: ListUsersQueryDto) {
    // Hỗ trợ cả roleCode và role (alias): GET /users?role=teacher&status=active
    const roleCode = query.roleCode ?? (query.role ? query.role.toUpperCase() : undefined);
    const { items, total } = await this.userRepo.findAll({
      search: query.search,
      roleCode,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    const mappedItems = items.map(info => AuthMapper.toSystemUser(info.user, info.roles));

    return {
      items: mappedItems,
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
