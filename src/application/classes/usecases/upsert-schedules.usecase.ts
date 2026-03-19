import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { UpsertSchedulesBody } from "../dtos/schedule.dto";
import { ClassMapper } from "../mappers/classes.mapper";

export class UpsertSchedulesUseCase {
  constructor(private readonly classRepo: ClassRepoPort) {}

  async execute(classId: string, dto: UpsertSchedulesBody) {
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw new Error(`Class ${classId} not found`);
    }

    const schedules = await this.classRepo.upsertSchedules(
      classId,
      dto.schedules
    );

    return schedules.map((s) => ClassMapper.toScheduleResponse(s));
  }
}
