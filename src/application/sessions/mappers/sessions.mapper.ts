import { Session } from "../../../domain/sessions/entities/session.entity";

export interface SessionResponse {
  id: string;
  classId: string;
  sessionDate: string; // ISO String
  unitNo: number;
  lessonNo: number;
  lessonPattern: string | null;
  sessionType: string;
  mainTeacherId: string | null;
  coverTeacherId: string | null;
  createdAt: string;
  isSpecial: boolean; // True nếu lessonNo = 0
}

/**
 * Ánh xạ Domain Session sang Response DTO (camelCase)
 */
export class SessionMapper {
  static toResponse(session: Session): SessionResponse {
    return {
      id: session.id,
      classId: session.classId,
      sessionDate: session.sessionDate.toISOString(),
      unitNo: session.unitNo,
      lessonNo: session.lessonNo,
      lessonPattern: session.lessonPattern ?? null,
      sessionType: session.sessionType,
      mainTeacherId: session.mainTeacherId || null,
      coverTeacherId: session.coverTeacherId || null,
      createdAt: session.createdAt.toISOString(),
      // Đánh dấu các buổi kiểm tra đặc biệt (quy ước lessonNo = 0)
      isSpecial: session.lessonNo === 0,
    };
  }
}
