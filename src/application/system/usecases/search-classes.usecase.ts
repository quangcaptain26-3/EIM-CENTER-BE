import { ISearchRepo } from '../../../domain/system/repositories/search.repo.port';
import { SearchDto } from '../dtos/search.dto';

export class SearchClassesUseCase {
  constructor(private readonly searchRepo: ISearchRepo) {}

  async execute(dto: SearchDto) {
    const { q, limit } = dto;
    const query = q.trim();

    return this.searchRepo.searchClasses(query, limit);
  }
}
