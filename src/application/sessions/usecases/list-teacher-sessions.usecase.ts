/**
 * Lịch dạy của GV theo tháng — Q3 (“Lịch dạy của tôi”), OVERVIEW §7.3 (GV điểm danh).
 *
 * Cách vận hành:
 * - Gom sessions mà GV là chủ nhiệm và các buổi được assign cover; map nhãn ca (shift) để FE hiển thị.
 */
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

    const classCache = new Map<string, { classCode?: string; roomCode?: string | null }>();

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
          submittedAt?: Date | string;
          submitted_at?: Date | string;
        };
        const classId = s.classId ?? s.class_id ?? '';
        if (!classCache.has(classId)) {
          const cls = await this.classRepo.findById(classId);
          const clsJoin = cls as { classCode?: string; roomCode?: string | null } | null;
          classCache.set(classId, {
            classCode: clsJoin?.classCode,
            roomCode: clsJoin?.roomCode ?? null,
          });
        }
        const classMeta = classCache.get(classId);
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
          classCode: classMeta?.classCode,
          roomCode: classMeta?.roomCode ?? undefined,
          shiftLabel: shiftLabel(Number(s.shift)),
          roleType: 'main' as const,
          status: s.status,
          submittedAt: s.submittedAt ?? s.submitted_at ?? null,
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
        roomCode: row.room_code != null ? String(row.room_code) : undefined,
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
