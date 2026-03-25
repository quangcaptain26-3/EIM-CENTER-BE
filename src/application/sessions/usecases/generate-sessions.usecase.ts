import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { GenerateSessionsBody } from "../dtos/generate-sessions.dto";
import { AppError } from "../../../shared/errors/app-error";
import { Session, SessionType } from "../../../domain/sessions/entities/session.entity";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ClassStaffRepoPort } from "../../../domain/classes/repositories/class-staff.repo.port";
import { ProgramRepoPort } from "../../../domain/curriculum/repositories/program.repo.port";
import { UnitRepoPort } from "../../../domain/curriculum/repositories/unit.repo.port";
import { UnitLesson } from "../../../domain/curriculum/entities/unit.entity";
import { buildAssessmentSessions } from "../../../domain/curriculum/services/assessment-session.rule";

export class GenerateSessionsUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly classRepo: ClassRepoPort,
    private readonly classStaffRepo: ClassStaffRepoPort,
    private readonly programRepo: ProgramRepoPort,
    private readonly unitRepo: UnitRepoPort
  ) {}

  private buildUnitSessionPlan(
    lessons: UnitLesson[],
  ): Array<{ lessonNo: number; lessonPattern: string; sessionType: SessionType }> {
    // Theo curriculum hiện tại: lesson_pattern gộp theo 1&2, 3, 4&5, 6&7
    // Với contract Session chỉ có 1 lessonNo, mình lưu lessonNo = lesson đầu tiên trong cụm.
    const groups = new Map<string, number>();
    for (const l of lessons) {
      const current = groups.get(l.sessionPattern);
      groups.set(l.sessionPattern, current === undefined ? l.lessonNo : Math.min(current, l.lessonNo));
    }

    const sorted = Array.from(groups.entries())
      .map(([pattern, lessonNo]) => ({ pattern, lessonNo }))
      .sort((a, b) => a.lessonNo - b.lessonNo);

    return sorted.map((g) => ({ lessonNo: g.lessonNo, lessonPattern: g.pattern, sessionType: "NORMAL" }));
  }

  private normalizeClassStartDate(raw: Date | string): Date {
    const d = raw instanceof Date ? new Date(raw) : new Date(String(raw));
    if (Number.isNaN(d.getTime())) {
      throw AppError.badRequest("startDate của lớp không hợp lệ");
    }
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * EDGE CASE A: Tìm ngày session đầu tiên — phải là ngày thuộc scheduleDays gần nhất >= startDate.
   * VD: start_date=Thứ Tư, lịch Tue/Thu → session[0] = Thứ Năm cùng tuần.
   * VD: start_date=Thứ Sáu, lịch Tue/Thu → session[0] = Thứ Ba tuần sau.
   * @param startDate Ngày bắt đầu lớp (đã normalize)
   * @param scheduleDays Các thứ trong tuần có lịch (JS getDay: 0=CN, 1=T2, ..., 6=T7)
   */
  private findFirstSessionDate(startDate: Date, scheduleDays: number[]): Date {
    const result = new Date(startDate);
    while (!scheduleDays.includes(result.getDay())) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }

  /**
   * Sinh các buổi học dự kiến
   */
  async execute(classId: string, payload: GenerateSessionsBody): Promise<Session[]> {
    if (!classId) {
      throw AppError.badRequest("classId is required");
    }

    // 1. Tải thông tin lớp & lịch học
    const classDetail = await this.classRepo.findById(classId);
    if (!classDetail) {
      throw AppError.notFound("Class không tồn tại");
    }
    const programId = classDetail.programId;
    
    const schedules = await this.classRepo.listSchedules(classId);
    if (!schedules || schedules.length === 0) {
      throw AppError.badRequest("Lớp học này chưa có lịch học (class_schedules)");
    }

    const existingSessions = await this.sessionRepo.listByClass(classId);
    if (existingSessions.length > 0) {
      if (!payload.replaceExisting) {
        throw AppError.conflict(
          "Lớp đã có buổi học. Gửi replaceExisting: true để xóa toàn bộ buổi hiện tại và sinh lại (sẽ mất dữ liệu feedback gắn buổi).",
          { code: "SESSIONS/CLASS_ALREADY_HAS_SESSIONS", existingCount: existingSessions.length },
        );
      }
      await this.sessionRepo.deleteByClassId(classId);
    }

    // 2. EDGE CASE B: totalUnits & sessions đọc từ DB — không hardcode.
    // Số session = (units × sessions/unit theo lesson pattern) + assessments; Kindy khác Flyers.
    const program = await this.programRepo.findProgramById(programId);
    if (!program) {
      throw AppError.badRequest("Không tìm thấy chương trình học (Program) của lớp", {
        code: "CURRICULUM/PROGRAM_NOT_FOUND",
        programId,
      });
    }
    const declaredTotalUnits = Number(program.totalUnits);
    if (!Number.isFinite(declaredTotalUnits) || declaredTotalUnits <= 0) {
      throw AppError.badRequest("Program.totalUnits không hợp lệ", {
        code: "CURRICULUM/INVALID_TOTAL_UNITS",
        programId,
        totalUnits: program.totalUnits,
      });
    }

    // 3. Tải units & lessons của program
    const units = await this.unitRepo.listUnitsByProgram(programId);
    if (!units || units.length === 0) {
      throw AppError.badRequest("Chương trình học (Program) này chưa có bài học (Units)");
    }
    units.sort((a, b) => a.unitNo - b.unitNo);

    // Guard: unit sequence phải đủ 1..declaredTotalUnits (không thiếu/gãy)
    const unitNos = units.map((u) => u.unitNo);
    const unitNoSet = new Set(unitNos);
    const missing: number[] = [];
    for (let i = 1; i <= declaredTotalUnits; i++) {
      if (!unitNoSet.has(i)) missing.push(i);
    }
    const extra = unitNos.filter((n) => n > declaredTotalUnits);
    if (missing.length > 0 || extra.length > 0) {
      throw AppError.badRequest("Unit sequence của Program không khớp với totalUnits (thiếu hoặc dư unit_no).", {
        code: "CURRICULUM/UNIT_SEQUENCE_MISMATCH",
        programId,
        declaredTotalUnits,
        missingUnitNos: missing,
        extraUnitNos: extra,
      });
    }

    // 4. Lấy giáo viên chính (MAIN teacher)
    const staffList = await this.classStaffRepo.listStaff(classId);
    const mainTeacherId = staffList.find((s) => s.type === "MAIN")?.userId ?? null;
    // TODO: Báo log warning nếu mainTeacherId = null. Theo yêu cầu, để null tạm.

    // 5. Build session plan theo curriculum (dựa trên lesson.sessionPattern)
    const plan: Array<{
      unitNo: number;
      lessonNo: number;
      lessonPattern: string | null;
      sessionType: SessionType;
    }> = [];
    const maxUnitNo = payload.untilUnitNo ?? Infinity;

    for (const u of units) {
      if (u.unitNo > maxUnitNo) break;

      // đảm bảo unit có lessons (nếu db chưa seed)
      await this.unitRepo.upsertDefaultLessons(u.id);
      const lessons = await this.unitRepo.listLessons(u.id);
      if (!lessons || lessons.length === 0) {
        throw AppError.badRequest(`Unit ${u.unitNo} chưa có Lessons`);
      }

      const unitPlan = this.buildUnitSessionPlan(lessons);
      for (const p of unitPlan) {
        plan.push({
          unitNo: u.unitNo,
          lessonNo: p.lessonNo,
          lessonPattern: p.lessonPattern,
          sessionType: p.sessionType,
        });
      }
    }

    // 5.1. Chèn các buổi khảo thí theo rule dựa trên tổng số unit (config-driven theo totalUnits)
    // - Chỉ chèn khi unitNo nằm trong phạm vi generate (tôn trọng untilUnitNo).
    // - lessonNo = 0 để giữ quy ước "buổi đặc biệt".
    const assessments = buildAssessmentSessions(declaredTotalUnits).filter((s) => s.unitNo <= maxUnitNo);
    if (assessments.length > 0) {
      const byUnit = new Map<number, Array<{ sessionType: SessionType }>>();
      assessments.forEach((a) => {
        const list = byUnit.get(a.unitNo) ?? [];
        list.push({ sessionType: a.sessionType });
        byUnit.set(a.unitNo, list);
      });

      const enriched: typeof plan = [];
      const lastIndexByUnit = new Map<number, number>();
      for (let i = 0; i < plan.length; i++) {
        lastIndexByUnit.set(plan[i].unitNo, i);
      }
      for (let idx = 0; idx < plan.length; idx++) {
        const item = plan[idx];
        enriched.push(item);
        const isLastInUnit = lastIndexByUnit.get(item.unitNo) === idx;
        const special = byUnit.get(item.unitNo);
        if (isLastInUnit && special) {
          special.forEach((s) => {
            enriched.push({
              unitNo: item.unitNo,
              lessonNo: 0,
              lessonPattern: null,
              sessionType: s.sessionType,
            });
          });
          byUnit.delete(item.unitNo);
        }
      }

      // Trường hợp rule trả về unitNo mà plan không có (data unit bị thiếu):
      // vẫn append ở cuối để không mất buổi khảo thí.
      for (const [unitNo, specs] of byUnit.entries()) {
        specs.forEach((s) => {
          enriched.push({ unitNo, lessonNo: 0, lessonPattern: null, sessionType: s.sessionType });
        });
      }

      plan.splice(0, plan.length, ...enriched);
    }

    if (plan.length === 0) {
      throw AppError.badRequest("Không có session nào để generate theo curriculum hiện tại");
    }

    // 6. Cấp phát ngày học theo lịch học
    // Chuyển weekday DB (1=T2..7=CN) sang JS getDay (0=CN, 1=T2..6=T7)
    const validWeekdays = schedules.map((s) => (s.weekday === 7 ? 0 : s.weekday));
    let targetTotalSessions = payload.weeks ? payload.weeks * schedules.length : Infinity;

    const generatedSessions: Array<Omit<Session, "id" | "createdAt">> = [];
    // EDGE CASE A: Tìm ngày session đầu tiên — duyệt từ startDate, chọn ngày schedule gần nhất >= startDate
    const normalizedStart = this.normalizeClassStartDate(classDetail.startDate);
    let currentDate = this.findFirstSessionDate(normalizedStart, validWeekdays);

    while (generatedSessions.length < targetTotalSessions && plan.length > 0) {
      const dayOfWeek = currentDate.getDay();
      if (validWeekdays.includes(dayOfWeek)) {
        const next = plan.shift()!;
        generatedSessions.push({
          classId,
          sessionDate: new Date(currentDate),
          sessionStatus: "SCHEDULED",
          unitNo: next.unitNo,
          lessonNo: next.lessonNo,
          lessonPattern: next.lessonPattern,
          sessionType: next.sessionType,
          mainTeacherId,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 7. Lưu vào cơ sở dữ liệu (createMany)
    const resultSessions = await this.sessionRepo.createMany(generatedSessions);
    return resultSessions;
  }
}
