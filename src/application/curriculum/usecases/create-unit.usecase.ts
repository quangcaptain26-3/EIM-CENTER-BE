import { UnitRepoPort } from '../../../domain/curriculum/repositories/unit.repo.port';
import { ProgramRepoPort } from '../../../domain/curriculum/repositories/program.repo.port';
import { CreateUnitBody } from '../dtos/unit.dto';
import { CurriculumMapper } from '../mappers/curriculum.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class CreateUnitUseCase {
  constructor(
    private readonly unitRepo: UnitRepoPort,
    private readonly programRepo: ProgramRepoPort
  ) {}

  async execute(programId: string, input: CreateUnitBody) {
    // 1. Kiểm tra Program có tồn tại không
    const program = await this.programRepo.findProgramById(programId);
    if (!program) {
      throw AppError.notFound(`Không tìm thấy Chương trình học với ID: ${programId}`);
    }

    // 2. Tạo Unit mới
    // Lưu ý: Nếu gửi trùng unitNo trong một programId, constraint DB (unique: program_id, unit_no) sẽ throw lỗi
    // Ở tầng App mình catch hoặc kệ lỗi 500 ném ra từ DB cho dev dễ trace
    const newUnit = await this.unitRepo.createUnit(programId, input.unitNo, input.title);

    // 3. (Bước quan trọng) Sinh tự động 7 Lessons mặc định cho Unit này
    await this.unitRepo.upsertDefaultLessons(newUnit.id);

    // 4. Lấy lại toàn bộ Data để trả về
    const lessons = await this.unitRepo.listLessons(newUnit.id);

    return CurriculumMapper.toUnitWithLessonsResponse(newUnit, lessons);
  }
}
