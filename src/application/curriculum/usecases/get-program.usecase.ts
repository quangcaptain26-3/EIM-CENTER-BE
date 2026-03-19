import { ProgramRepoPort } from '../../../domain/curriculum/repositories/program.repo.port';
import { CurriculumMapper } from '../mappers/curriculum.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class GetProgramUseCase {
  constructor(private readonly programRepo: ProgramRepoPort) {}

  async execute(id: string) {
    const program = await this.programRepo.findProgramById(id);
    
    if (!program) {
      throw AppError.notFound(`Không tìm thấy chương trình học với ID: ${id}`);
    }

    return CurriculumMapper.toProgramResponse(program);
  }
}
