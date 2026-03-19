import { UnitRepoPort } from '../../../domain/curriculum/repositories/unit.repo.port';
import { CurriculumMapper } from '../mappers/curriculum.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class GetUnitUseCase {
  constructor(private readonly unitRepo: UnitRepoPort) {}

  async execute(unitId: string) {
    const unit = await this.unitRepo.findUnitById(unitId);
    if (!unit) {
      throw AppError.notFound(`Không tìm thấy Unit với ID: ${unitId}`);
    }

    const lessons = await this.unitRepo.listLessons(unitId);
    
    return CurriculumMapper.toUnitWithLessonsResponse(unit, lessons);
  }
}
