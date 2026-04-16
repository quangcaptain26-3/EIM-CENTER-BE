import { ISearchRepo } from '../../../domain/system/repositories/search.repo.port';
import { SearchUsersDto } from '../dtos/search.dto';

export class SearchUsersUseCase {
  constructor(private readonly searchRepo: ISearchRepo) {}

  async execute(dto: SearchUsersDto) {
    const { q, roleCode, limit } = dto;
    const query = q.trim();

    // 1. Detect User Code: EIM-ADM-xxxxx, EIM-GV-xxxxx, etc.
    if (/^EIM-[A-Z]+-\d+$/i.test(query)) {
      return this.searchRepo.searchUsersByCode(query, roleCode, limit);
    }

    // 2. Detect Phone or CCCD: 9 to 12 digits
    if (/^\d{9,12}$/.test(query)) {
      return this.searchRepo.searchUsersByPhoneOrCccd(query, roleCode, limit);
    }

    // 3. Fallback to Full-Text Search
    return this.searchRepo.searchUsersFts(query, roleCode, limit);
  }
}
