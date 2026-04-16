import { SHIFTS, type ShiftNumber } from '../../../config/constants';
import { IAttendanceRepo } from '../../../domain/students/repositories/attendance.repo.port';

export interface AttendanceHistoryApiItem {
  id: string;
  sessionId: string;
  enrollmentId: string;
  studentId: string;
  status: string;
  note: string | null;
  sessionNo: number;
  sessionDate: string;
  shift: number;
  shiftLabel: string;
  /** VD "18:00–19:30" */
  timeRange: string;
}

export class GetAttendanceHistoryUseCase {
  constructor(private readonly attendanceRepo: IAttendanceRepo) {}

  async execute(enrollmentId: string): Promise<AttendanceHistoryApiItem[]> {
    const rows = await this.attendanceRepo.findHistoryByEnrollment(enrollmentId);
    return rows.map((r) => {
      const sn = r.shift as ShiftNumber;
      const def = SHIFTS[sn] ?? SHIFTS[1];
      return {
        id: r.id,
        sessionId: r.sessionId,
        enrollmentId: r.enrollmentId,
        studentId: r.studentId,
        status: r.status,
        note: r.note,
        sessionNo: r.sessionNo,
        sessionDate: r.sessionDate,
        shift: r.shift,
        shiftLabel: def.label,
        timeRange: `${def.start}–${def.end}`,
      };
    });
  }
}
