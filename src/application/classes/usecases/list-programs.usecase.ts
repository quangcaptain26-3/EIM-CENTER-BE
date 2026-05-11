import { IProgramRepo } from '../../../domain/classes/repositories/class.repo.port';

export class ListProgramsUseCase {
  constructor(private readonly programRepo: IProgramRepo) {}

  async execute() {
    return await this.programRepo.findAll();
  }
}
