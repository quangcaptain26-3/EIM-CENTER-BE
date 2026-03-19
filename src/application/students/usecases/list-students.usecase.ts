import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { ListStudentsQuery } from "../dtos/student.dto";
import { StudentsMapper } from "../mappers/students.mapper";

export class ListStudentsUseCase {
  constructor(private readonly studentRepo: StudentRepoPort) {}

  async execute(query: ListStudentsQuery) {
    const { search, limit = 10, offset = 0 } = query;

    const [items, total] = await Promise.all([
      this.studentRepo.list({ search, limit, offset }),
      this.studentRepo.count({ search })
    ]);

    return {
      items: items.map(StudentsMapper.toStudentResponse),
      total,
      limit,
      offset,
    };
  }
}
