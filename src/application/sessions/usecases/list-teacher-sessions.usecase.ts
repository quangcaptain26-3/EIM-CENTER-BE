import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { ISessionRepo, ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';

function shiftLabel(shift: number): string {
  if (shift === 1) return 'Ca 1 (18:00–19:30)';
  if (shift === 2) return 'Ca 2 (19:30–21:00)';
  return `Ca ${shift}`;
}

function sessionDateIso(sess: { sessionDate?: Date; session_date?: Date | string }): string {
  const d = sess.sessionDate ?? sess.session_date;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export class ListTeacherSessionsUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly sessionCoverRepo: ISessionCoverRepo,
    private readonly classRepo: IClassRepo,
    private readonly userRepo: IUserRepo,
  ) {}

  async execute(teacherId: string, month: number, year: number) {
    const mainSessions = await this.sessionRepo.findByTeacher(teacherId, month, year);
    const coverRows = await this.sessionCoverRepo.findCoversByTeacher(teacherId, month, year);

    const classCache = new Map<string, string | undefined>();

    const mainMapped = await Promise.all(
      mainSessions.map(async (raw) => {
        const s = raw as {
          id: string;
          classId?: string;
          class_id?: string;
          shift?: number;
          status: string;
          sessionDate?: Date;
          session_date?: Date | string;
        };
        const classId = s.classId ?? s.class_id ?? '';
        if (!classCache.has(classId)) {
          const cls = await this.classRepo.findById(classId);
          classCache.set(classId, cls?.classCode);
        }
        const scheduledDate = sessionDateIso(s);
        let coverTeacherName: string | undefined;
        const cover = await this.sessionCoverRepo.findBySession(s.id);
        if (cover && cover.status !== 'cancelled') {
          const cid = cover.coverTeacherId;
          if (cid) {
            const u = await this.userRepo.findById(cid);
            coverTeacherName = u?.fullName ?? undefined;
          }
        }
        return {
          id: s.id,
          scheduledDate,
          classId,
          classCode: classCache.get(classId),
          shiftLabel: shiftLabel(Number(s.shift)),
          roleType: 'main' as const,
          status: s.status,
          coverTeacherName,
        };
      }),
    );

    const coverMapped = coverRows.map((row: Record<string, unknown>) => {
      const sessionDate = row.session_date as Date | string;
      const scheduledDate =
        sessionDate instanceof Date ? sessionDate.toISOString().slice(0, 10) : String(sessionDate).slice(0, 10);
      return {
        id: row.session_id as string,
        scheduledDate,
        classId: row.class_id as string,
        classCode: row.class_code as string | undefined,
        shiftLabel: shiftLabel(Number(row.shift)),
        roleType: 'cover' as const,
        status: row.status as string,
      };
    });

    const sessions = [...mainMapped, ...coverMapped].sort((a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate),
    );

    const todayYmd = new Date().toISOString().slice(0, 10);
    const taught = sessions.filter((x) => x.status === 'completed').length;
    const upcoming = sessions.filter(
      (x) => x.status === 'pending' && x.scheduledDate.slice(0, 10) >= todayYmd,
    ).length;

    return {
      sessions,
      summary: {
        total: sessions.length,
        totalSessions: sessions.length,
        taught,
        completed: taught,
        completedSessions: taught,
        upcoming,
        upcomingSessions: upcoming,
        cover: coverMapped.length,
        coverSessions: coverMapped.length,
        main: mainMapped.length,
      },
    };
  }
}
