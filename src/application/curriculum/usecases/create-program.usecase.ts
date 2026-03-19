import { ProgramRepoPort } from '../../../domain/curriculum/repositories/program.repo.port';
import { CreateProgramBody } from '../dtos/program.dto';
import { CurriculumMapper } from '../mappers/curriculum.mapper';

export class CreateProgramUseCase {
  constructor(private readonly programRepo: ProgramRepoPort) {}

  async execute(input: CreateProgramBody) {
    const newProgram = await this.programRepo.createProgram({
      code: input.code,
      name: input.name,
      level: input.level,
      totalUnits: input.totalUnits,
      lessonsPerUnit: input.lessonsPerUnit ?? 7, // Mặc định là 7
      sessionsPerWeek: input.sessionsPerWeek ?? 2, // Mặc định là 2
      feePlanId: input.feePlanId,
    });
    
    return CurriculumMapper.toProgramResponse(newProgram);
  }
}
