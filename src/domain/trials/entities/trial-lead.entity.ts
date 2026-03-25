/**
 * State machine: new → scheduled → completed → converted | lost
 *                  new → lost (không liên hệ được)
 *
 * 5 trạng thái chính: new | scheduled | completed | converted | lost
 * - NEW: Mới tạo, chưa liên hệ
 * - SCHEDULED: Đã đặt lịch học thử
 * - ATTENDED: Đã học thử (completed) — có thể convert hoặc lost
 * - CONVERTED: Đã chuyển thành học viên chính thức
 * - CLOSED: Đã đóng / lost (không liên hệ được, từ chối, vắng mặt...)
 *
 * Trạng thái trung gian: CONTACTED (đã liên hệ), NO_SHOW (đặt lịch nhưng vắng)
 */
export type TrialStatus =
  | "NEW"        // new
  | "CONTACTED"  // trung gian: đã liên hệ
  | "SCHEDULED"  // scheduled
  | "ATTENDED"   // completed — đã học thử
  | "NO_SHOW"    // trung gian: vắng
  | "CONVERTED"  // converted
  | "CLOSED";    // lost

export interface TrialLead {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: TrialStatus;
  note?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  // Optional nhúng schedule để hiển thị nhanh ở trang danh sách.
  // Với luồng GET /:id thì schedule được truyền qua TrialsMapper.toResponse(...)
  // nên FE vẫn render đúng.
  schedule?: TrialSchedule | null;
}

export interface TrialSchedule {
  id: string;
  trialId: string;
  classId: string;
  trialDate: Date;
  createdAt: Date;
}

export interface TrialConversion {
  id: string;
  trialId: string;
  studentId: string;
  enrollmentId: string;
  convertedAt: Date;
}
