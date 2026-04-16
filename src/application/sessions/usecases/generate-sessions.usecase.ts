import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { SessionGeneratorService } from '../../../domain/sessions/services/session-generator.service';
import { IClassRepo, IClassStaffRepo } from '../../../domain/classes/repositories/class.repo.port';
import { HolidayPgRepo } from '../../../infrastructure/db/repositories/classes/holiday.pg.repo';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class GenerateSessionsUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly classStaffRepo: IClassStaffRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly holidayRepo: HolidayPgRepo,
    private readonly programRepo: any,
    private readonly auditRepo: any,
    private readonly generator: SessionGeneratorService
  ) {}

  async execute(userId: string, actorRole: string, classId: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN hoặc ACADEMIC mới sinh được lịch buổi học',
        403,
      );
    }

    const tClass = await this.classRepo.findById(classId);
    if (!tClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }
    if (tClass.status !== 'pending') {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp phải ở trạng thái pending để sinh buổi học', 422);
    }

    const staffList = await this.classStaffRepo.findActiveByClass(classId);
    const mainTeacher = staffList[0];
    if (!mainTeacher) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp chưa có giáo viên chính active', 422);
    }
    const teacherId = mainTeacher.teacher_id || mainTeacher.teacherId;

    const program = await this.programRepo?.findById(tClass.programId);
    const totalSessions = program ? program.totalSessions : 24;

    const holidays = await this.holidayRepo.findAll();

    const sessions = this.generator.generate({
      classId: tClass.id,
      teacherId: teacherId,
      shift: tClass.shift,
      scheduleDays: tClass.scheduleDays,
      startDate: tClass.startDate || new Date(),
      holidays: holidays,
      totalSessions: totalSessions,
    });

    await this.sessionRepo.bulkCreate(sessions);
    await this.classRepo.updateStatus(classId, 'active');

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:sessions_generated', { classId, generatedBy: userId, count: sessions.length });
    }

    return {
      sessionsCreated: sessions.length,
      firstDate: sessions[0].sessionDate,
      lastDate: sessions[sessions.length - 1].sessionDate
    };
  }
}
