import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';

export class ListUpcomingClassesUseCase {
  constructor(private readonly classRepo: IClassRepo) {}

  async execute() {
    return this.classRepo.findAnnouncedUpcoming();
  }
}
