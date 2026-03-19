import { UnitRepoPort } from '../../../domain/curriculum/repositories/unit.repo.port';
import { UpdateUnitBody } from '../dtos/unit.dto';
import { CurriculumMapper } from '../mappers/curriculum.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class UpdateUnitUseCase {
  constructor(private readonly unitRepo: UnitRepoPort) {}

  async execute(unitId: string, input: UpdateUnitBody) {
    const existingUnit = await this.unitRepo.findUnitById(unitId);
    if (!existingUnit) {
      throw AppError.notFound(`Không tìm thấy Unit với ID: ${unitId}`);
    }

    const updatedUnit = await this.unitRepo.updateUnit(unitId, input);
    
    return CurriculumMapper.toUnitResponse(updatedUnit);
  }
}
