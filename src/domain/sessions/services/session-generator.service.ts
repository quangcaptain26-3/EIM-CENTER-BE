// src/domain/sessions/services/session-generator.service.ts
import { SessionType } from "../entities/session.entity";

export interface GenerateSessionsConfig {
  classId: string;
  startDate: Date;
  totalLessons: number;
  schedule: Array<{
    weekday: number; // 1 (Thứ 2) đến 7 (Chủ nhật)
    startTime: string;
    endTime: string;
  }>;
  holidays?: Date[];
}

/**
 * Service sinh danh sách các buổi học dự kiến
 */
export class SessionGeneratorService {
  /**
   * Tạo ra danh sách buổi học
   */
  // TODO: Implement logic sinh buổi học (Module 5C)
  // public generateSessions(config: GenerateSessionsConfig): any[] { ... }
}
