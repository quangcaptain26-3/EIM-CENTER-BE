import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { CreateClassBody } from "../dtos/class.dto";
import { ClassMapper } from "../mappers/classes.mapper";

export class CreateClassUseCase {
  constructor(private readonly classRepo: ClassRepoPort) {}

  async execute(dto: CreateClassBody) {
    const newClass = await this.classRepo.create({
      code: dto.code,
      name: dto.name,
      programId: dto.programId,
      room: dto.room,
      capacity: dto.capacity,
      startDate: dto.startDate,
      status: dto.status,
    });

    return ClassMapper.toResponse(newClass);
  }
}
