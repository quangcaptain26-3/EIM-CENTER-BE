import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { ISessionRepo, ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';

function sessionTeacherId(sess: { teacherId?: string; teacher_id?: string }): string {
  return sess.teacherId ?? sess.teacher_id ?? '';
}

function sessionNo(sess: { sessionNo?: number; session_no?: number }): number {
  return sess.sessionNo ?? sess.session_no ?? 0;
}

function sessionDateIso(sess: { sessionDate?: Date; session_date?: Date | string }): string {
  const d = sess.sessionDate ?? sess.session_date;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export class ListClassSessionsUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly sessionCoverRepo: ISessionCoverRepo,
    private readonly userRepo: IUserRepo,
    private readonly classRepo: IClassRepo,
  ) {}

  async execute(classId: string) {
    const sessions = await this.sessionRepo.findByClass(classId);

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (sess) => {
        const row = sess as unknown as Record<string, unknown>;
        const s = row as {
          id: string;
          status: string;
          shift?: number;
          session_no?: number;
          sessionNo?: number;
        };
        const cover = await this.sessionCoverRepo.findBySession(s.id);
        const tid = sessionTeacherId(row as { teacherId?: string; teacher_id?: string });
        const mainUser = tid ? await this.userRepo.findById(tid) : null;

        let coverTeacherName: string | null = null;
        let coverTeacherId: string | null = null;
        let coverStatus: string | null = null;

        if (cover) {
          const cid =
            (cover as { coverTeacherId?: string; cover_teacher_id?: string }).coverTeacherId ??
            (cover as { cover_teacher_id?: string }).cover_teacher_id;
          coverTeacherId = cid ?? null;
          if (cid) {
            const covUser = await this.userRepo.findById(cid);
            coverTeacherName = covUser?.fullName ?? null;
          }
          coverStatus = (cover as { status?: string }).status ?? null;
        }

        return {
          id: s.id,
          sequenceNo: sessionNo(row as { sessionNo?: number; session_no?: number }),
          scheduledDate: sessionDateIso(
            row as { sessionDate?: Date; session_date?: Date | string },
          ),
          status: s.status,
          shift: s.shift,
          mainTeacherId: tid || undefined,
          mainTeacherName: mainUser?.fullName ?? undefined,
          coverTeacherId,
          coverTeacherName,
          coverStatus,
          attendanceSummary: {
            present: 0,
            absent: 0,
            late: 0,
          },
        };
      }),
    );

    const cls = await this.classRepo.findById(classId);
    const classCode = cls?.classCode;

    return { sessions: sessionsWithDetails, classId, classCode };
  }
}
