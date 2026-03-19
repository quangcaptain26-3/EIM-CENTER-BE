import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ListClassesQuery } from "../dtos/class.dto";
import { ClassMapper } from "../mappers/classes.mapper";

export class ListClassesUseCase {
  constructor(private readonly classRepo: ClassRepoPort) {}

  async execute(query: ListClassesQuery) {
    const [items, total] = await Promise.all([
      this.classRepo.list(query),
      this.classRepo.count(query),
    ]);

    return {
      items: items.map((c) => ClassMapper.toResponse(c)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
