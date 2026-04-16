import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';

/** FE gửi `month=YYYY-MM` (month picker); hoặc `month=1-12` + `year`. */
function parseTeacherSessionsMonthYear(
  monthRaw: unknown,
  yearRaw: unknown,
): { month: number; year: number } {
  const now = new Date();
  const fallbackMonth = now.getMonth() + 1;
  const fallbackYear = now.getFullYear();

  if (typeof monthRaw === 'string') {
    const trimmed = monthRaw.trim();
    const ym = /^(\d{4})-(\d{2})$/.exec(trimmed);
    if (ym) {
      const y = Number(ym[1]);
      const m = Number(ym[2]);
      if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
        return { month: m, year: y };
      }
    }
  }

  const m = monthRaw !== undefined && monthRaw !== '' ? Number(monthRaw) : NaN;
  const y = yearRaw !== undefined && yearRaw !== '' ? Number(yearRaw) : NaN;
  if (Number.isFinite(m) && m >= 1 && m <= 12 && Number.isFinite(y) && y >= 2000 && y <= 2100) {
    return { month: Math.trunc(m), year: Math.trunc(y) };
  }

  return { month: fallbackMonth, year: fallbackYear };
}

function pickSessionFields(s: Record<string, unknown>) {
  const sessionDate = (s.sessionDate ?? s.session_date) as Date | string | undefined;
  const scheduledDate =
    sessionDate instanceof Date ? sessionDate.toISOString().slice(0, 10) : String(sessionDate ?? '').slice(0, 10);
  return {
    id: s.id as string,
    classId: (s.classId ?? s.class_id) as string,
    teacherId: (s.teacherId ?? s.teacher_id) as string,
    sessionNo: (s.sessionNo ?? s.session_no) as number,
    scheduledDate,
    sessionDate: scheduledDate,
    shift: s.shift as number,
    status: s.status as string,
  };
}

export function createSessionController(
  rescheduleSessionUsecase: any,
  assignCoverUsecase: any,
  cancelCoverUsecase: any,
  listTeacherSessionsUsecase: any,
  findAvailableCoversUsecase: any,
  sessionRepo: any,
  sessionCoverRepo: any,
  attendanceRepo: any,
  userRepo: any,
  classRepo: any,
) {
  async function buildSessionDetailPayload(sessionId: string) {
    const session = await sessionRepo.findById(sessionId);
    if (!session) return null;
    const s = session as unknown as Record<string, unknown>;
    const base = pickSessionFields(s);
    const cover = await sessionCoverRepo.findBySession(sessionId);
    const attendanceRows = await attendanceRepo.findDetailRowsBySession(sessionId);

    const [classRow, mainUser] = await Promise.all([
      classRepo.findById(base.classId),
      userRepo.findById(base.teacherId),
    ]);

    let coverTeacherName: string | null = null;
    let coverPayload: Record<string, unknown> | null = null;
    if (cover) {
      const covId =
        (cover as { coverTeacherId?: string }).coverTeacherId ??
        (cover as { cover_teacher_id?: string }).cover_teacher_id;
      const covUser = covId ? await userRepo.findById(covId) : null;
      coverTeacherName = covUser?.fullName ?? null;
      const assignedAt = (cover as { createdAt?: Date }).createdAt ?? (cover as { assigned_at?: Date }).assigned_at;
      coverPayload = {
        coverTeacherId: covId,
        coverTeacherName,
        reason: (cover as { reason?: string }).reason ?? null,
        status: (cover as { status?: string }).status,
        assignedAt: assignedAt instanceof Date ? assignedAt.toISOString() : String(assignedAt ?? ''),
      };
    }

    return {
      ...base,
      classCode: classRow?.classCode ?? classRow?.class_code,
      teacherName: mainUser?.fullName ?? '',
      mainTeacherName: mainUser?.fullName,
      mainTeacherId: base.teacherId,
      coverTeacherId: coverPayload?.coverTeacherId ?? null,
      coverTeacherName,
      coverStatus: cover ? (cover as { status?: string }).status ?? null : null,
      coverReason: cover ? (cover as { reason?: string }).reason ?? null : null,
      cover: coverPayload,
      attendanceRows,
    };
  }

  return {
    getSession: async (req: Request, res: Response) => {
      try {
        const sessionId = String(req.params.id);
        const payload = await buildSessionDetailPayload(sessionId);
        if (!payload) return res.status(404).json({ code: 'NOT_FOUND', message: 'Session not found' });
        res.status(200).json(payload);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    reschedule: async (req: Request, res: Response) => {
      try {
        const sessionId = String(req.params.id);
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const { newDate, reason } = req.body;
        const result = await rescheduleSessionUsecase.execute(userId, role, sessionId, newDate, reason);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    findAvailableCovers: async (req: Request, res: Response) => {
      try {
        const result = await findAvailableCoversUsecase.execute(String(req.params.id));
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    assignCover: async (req: Request, res: Response) => {
      try {
        const sessionId = String(req.params.id);
        const userId = (req as any).user.id;
        const role = (req as any).user.role;
        const { coverTeacherId, reason } = req.body;
        await assignCoverUsecase.execute(userId, role, sessionId, coverTeacherId, reason);
        const payload = await buildSessionDetailPayload(sessionId);
        res.status(200).json(payload);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    cancelCover: async (req: Request, res: Response) => {
      try {
        const sessionId = String(req.params.id);
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        const existingCover = await sessionCoverRepo.findBySession(sessionId);
        if (!existingCover) {
          return res.status(404).json({ code: 'NOT_FOUND', message: 'No active cover found' });
        }

        await cancelCoverUsecase.execute(userId, role, sessionId);
        const payload = await buildSessionDetailPayload(sessionId);
        res.status(200).json(payload);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
    listTeacherSessions: async (req: Request, res: Response) => {
      try {
        const teacherId = (req as any).user.id;
        const { month, year } = parseTeacherSessionsMonthYear(req.query.month, req.query.year);
        const result = await listTeacherSessionsUsecase.execute(teacherId, month, year);
        res.status(200).json(result);
      } catch (error: unknown) {
        sendErrorResponse(res, error);
      }
    },
  };
}
