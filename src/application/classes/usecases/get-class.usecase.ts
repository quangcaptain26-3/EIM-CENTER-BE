import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ClassStaffRepoPort } from "../../../domain/classes/repositories/class-staff.repo.port";
import { ClassMapper } from "../mappers/classes.mapper";

export class GetClassUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly classStaffRepo: ClassStaffRepoPort
  ) {}

  async execute(classId: string) {
    const entity = await this.classRepo.findById(classId);
    if (!entity) {
      throw new Error(`Class ${classId} not found`);
    }

    const [schedules, staff] = await Promise.all([
      this.classRepo.listSchedules(classId),
      this.classStaffRepo.listStaff(classId),
    ]);

    return ClassMapper.toDetailResponse(entity, schedules, staff);
  }
}
