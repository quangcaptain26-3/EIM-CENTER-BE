import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ClassStaffRepoPort } from "../../../domain/classes/repositories/class-staff.repo.port";
import { StaffType } from "../../../domain/classes/entities/class-staff.entity";

export class RemoveStaffUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly classStaffRepo: ClassStaffRepoPort
  ) {}

  async execute(classId: string, userId: string, type: StaffType) {
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw new Error(`Class ${classId} not found`);
    }

    await this.classStaffRepo.removeStaff(classId, userId, type);
  }
}
