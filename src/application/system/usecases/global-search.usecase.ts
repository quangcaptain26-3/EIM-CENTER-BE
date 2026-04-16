import { SearchStudentsUseCase } from './search-students.usecase';
import { SearchUsersUseCase } from './search-users.usecase';
import { SearchClassesUseCase } from './search-classes.usecase';
import { SearchDto } from '../dtos/search.dto';

export class GlobalSearchUseCase {
  constructor(
    private readonly searchStudentsUseCase: SearchStudentsUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly searchClassesUseCase: SearchClassesUseCase,
  ) {}

  async execute(dto: SearchDto) {
    const { q } = dto;
    const limit = 5; // Fixed limit of 5 per entity for global search

    const [students, users, classes] = await Promise.all([
      this.searchStudentsUseCase.execute({ q, limit }).catch(err => {
        console.error('Failed to search students in global search:', err);
        return [];
      }),
      this.searchUsersUseCase.execute({ q, limit }).catch(err => {
        console.error('Failed to search users in global search:', err);
        return [];
      }),
      this.searchClassesUseCase.execute({ q, limit }).catch(err => {
        console.error('Failed to search classes in global search:', err);
        return [];
      }),
    ]);

    const globalResults = [
      ...students.map(s => ({ ...s, type: 'student' as const })),
      ...users.map(u => ({ ...u, type: 'user' as const })),
      ...classes.map(c => ({ ...c, type: 'class' as const })),
    ];

    // Optional: Sort or rank results based on exact match or relevance here
    // Currently just returning them combined.
    return globalResults.slice(0, 15);
  }
}
