import { UnitRepoPort } from '../../../domain/curriculum/repositories/unit.repo.port';
import { ProgramRepoPort } from '../../../domain/curriculum/repositories/program.repo.port';
import { CurriculumMapper } from '../mappers/curriculum.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class ListUnitsUseCase {
  constructor(
    private readonly unitRepo: UnitRepoPort,
    private readonly programRepo: ProgramRepoPort
  ) {}

  async execute(programId: string) {
    const program = await this.programRepo.findProgramById(programId);
    if (!program) {
      throw AppError.notFound(`Không tìm thấy Chương trình học với ID: ${programId}`);
    }

    const units = await this.unitRepo.listUnitsByProgram(programId);
    return units.map(u => CurriculumMapper.toUnitResponse(u));
  }
}
