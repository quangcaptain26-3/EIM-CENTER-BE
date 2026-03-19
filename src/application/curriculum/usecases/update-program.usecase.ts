import { ProgramRepoPort } from '../../../domain/curriculum/repositories/program.repo.port';
import { UpdateProgramBody } from '../dtos/program.dto';
import { CurriculumMapper } from '../mappers/curriculum.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class UpdateProgramUseCase {
  constructor(private readonly programRepo: ProgramRepoPort) {}

  async execute(id: string, input: UpdateProgramBody) {
    // 1. Kiểm tra tồn tại
    const existingProgram = await this.programRepo.findProgramById(id);
    if (!existingProgram) {
      throw AppError.notFound(`Không tìm thấy chương trình học với ID: ${id}`);
    }

    // 2. Cập nhật qua repo
    const updatedProgram = await this.programRepo.updateProgram(id, input);
    
    // 3. Trả kết quả
    return CurriculumMapper.toProgramResponse(updatedProgram);
  }
}
