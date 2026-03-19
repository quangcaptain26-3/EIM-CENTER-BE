import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { UpdateClassBody } from "../dtos/class.dto";
import { ClassMapper } from "../mappers/classes.mapper";

export class UpdateClassUseCase {
  constructor(private readonly classRepo: ClassRepoPort) {}

  async execute(id: string, dto: UpdateClassBody) {
    const existing = await this.classRepo.findById(id);
    if (!existing) {
      throw new Error(`Class ${id} not found`);
    }

    const updated = await this.classRepo.update(id, {
      name: dto.name,
      room: dto.room,
      capacity: dto.capacity,
      startDate: dto.startDate,
      status: dto.status,
    });

    return ClassMapper.toResponse(updated);
  }
}
