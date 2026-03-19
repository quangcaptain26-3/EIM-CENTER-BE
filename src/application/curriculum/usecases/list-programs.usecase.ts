import { ProgramRepoPort } from '../../../domain/curriculum/repositories/program.repo.port';
import { CurriculumMapper } from '../mappers/curriculum.mapper';

export class ListProgramsUseCase {
  constructor(private readonly programRepo: ProgramRepoPort) {}

  async execute() {
    const programs = await this.programRepo.listPrograms();
    return programs.map(p => CurriculumMapper.toProgramResponse(p));
  }
}
