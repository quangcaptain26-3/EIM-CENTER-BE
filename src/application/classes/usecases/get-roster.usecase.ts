import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { ClassMapper } from "../mappers/classes.mapper";

export class GetRosterUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly rosterRepo: RosterRepoPort
  ) {}

  async execute(classId: string) {
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw new Error(`Class ${classId} not found`);
    }

    const roster = await this.classRepo.findById(classId).then(() => {
        return this.rosterRepo.listRoster(classId);
    });

    return roster.map(student => ClassMapper.toRosterResponse(student));
  }
}
