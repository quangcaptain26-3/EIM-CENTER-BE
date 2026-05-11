import { ISearchRepo } from '../../../domain/system/repositories/search.repo.port';
import { SearchDto } from '../dtos/search.dto';

export class SearchStudentsUseCase {
  constructor(private readonly searchRepo: ISearchRepo) {}

  async execute(dto: SearchDto) {
    const { q, limit } = dto;
    const query = q.trim();

    // 1. Detect Student Code: EIM-HS-xxxxx
    if (/^EIM-HS-\d+$/i.test(query)) {
      return this.searchRepo.searchStudentsByCode(query, limit);
    }

    // 2. Detect Phone: 10 or 11 digits
    if (/^\d{10,11}$/.test(query)) {
      return this.searchRepo.searchStudentsByPhone(query, limit);
    }

    // 3. Detect DOB: dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(query)) {
      const [day, month, year] = query.split('/').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (!isNaN(parsedDate.getTime())) {
        return this.searchRepo.searchStudentsByDob(parsedDate, limit);
      }
    }

    // 4. Fallback to Full-Text Search
    return this.searchRepo.searchStudentsFts(query, limit);
  }
}
