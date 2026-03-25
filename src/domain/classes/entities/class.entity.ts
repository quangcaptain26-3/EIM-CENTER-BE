export type ClassStatus = "ACTIVE" | "PAUSED" | "CLOSED";

/**
 * Lớp học
 */
export interface Class {
  id: string; // UUID
  code: string;
  name: string;
  programId: string; // Ref: curriculum_programs.id
  /** Tên chương trình (join từ curriculum_programs) — chỉ có trong list/enriched queries */
  programName?: string | null;
  room?: string | null;
  capacity: number; // default: 16
  /** Sĩ số hiện tại (đếm enrollments ACTIVE) — chỉ có trong list/enriched queries */
  currentSize?: number;
  /** Số chỗ còn trống = capacity - currentSize — dùng cho search lớp còn chỗ (sau convert trial) */
  remainingCapacity?: number;
  startDate: Date | string; // DATE type in DB (e.g. "2024-01-01")
  status: ClassStatus; // ACTIVE, PAUSED, CLOSED
  createdAt: Date;
}

/**
 * Lịch học của lớp
 */
export interface ClassSchedule {
  id: string; // UUID
  classId: string; // Ref: classes.id
  weekday: number; // 1-7 (Mon-Sun)
  startTime: string; // TIME type in DB (e.g. "18:00:00")
  endTime: string; // TIME type in DB
  createdAt: Date;
}
