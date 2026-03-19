import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { CreateStudentBody } from "../dtos/student.dto";
import { StudentsMapper } from "../mappers/students.mapper";

export class CreateStudentUseCase {
  constructor(private readonly studentRepo: StudentRepoPort) {}

  async execute(input: CreateStudentBody) {
    const payload = {
      fullName: input.fullName,
      dob: input.dob ? new Date(input.dob) : undefined,
      gender: input.gender,
      phone: input.phone,
      email: input.email,
      guardianName: input.guardianName,
      guardianPhone: input.guardianPhone,
      address: input.address,
    };

    const student = await this.studentRepo.create(payload);
    return StudentsMapper.toStudentResponse(student);
  }
}
