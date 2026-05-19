const ACTION_LABELS: Record<string, string> = {
  enrolled: 'Ghi danh',
  trial_started: 'Bắt đầu học thử',
  activated: 'Kích hoạt học chính thức',
  paused: 'Bảo lưu',
  resumed: 'Tiếp tục học',
  class_changed: 'Chuyển lớp',
  program_changed: 'Đổi chương trình / cấp độ',
  transferred_out: 'Chuyển nhượng đi',
  transferred_in: 'Chuyển nhượng đến',
  dropped: 'Thôi học / hủy ghi danh',
  completed: 'Hoàn thành khóa',
  refunded_full: 'Hoàn học phí đủ',
};

export function enrollmentHistoryActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export type StudentEnrollmentHistoryRow = {
  id: string;
  enrollmentId: string;
  action: string;
  actionLabel: string;
  fromStatus: string | null;
  toStatus: string | null;
  fromClassId: string | null;
  toClassId: string | null;
  fromProgramId: string | null;
  toProgramId: string | null;
  fromProgramCode: string | null;
  fromProgramName: string | null;
  toProgramCode: string | null;
  toProgramName: string | null;
  fromClassCode: string | null;
  toClassCode: string | null;
  sessionsAtAction: number | null;
  changedBy: string | null;
  changedByName: string | null;
  note: string | null;
  actionDate: string;
  isPlacementAdjust: boolean;
};

export function mapEnrollmentHistoryRow(row: Record<string, unknown>): StudentEnrollmentHistoryRow {
  const note = row.note != null ? String(row.note) : null;
  return {
    id: String(row.id),
    enrollmentId: String(row.enrollment_id),
    action: String(row.action),
    actionLabel: enrollmentHistoryActionLabel(String(row.action)),
    fromStatus: row.from_status != null ? String(row.from_status) : null,
    toStatus: row.to_status != null ? String(row.to_status) : null,
    fromClassId: row.from_class_id != null ? String(row.from_class_id) : null,
    toClassId: row.to_class_id != null ? String(row.to_class_id) : null,
    fromProgramId: row.from_program_id != null ? String(row.from_program_id) : null,
    toProgramId: row.to_program_id != null ? String(row.to_program_id) : null,
    fromProgramCode: row.from_program_code != null ? String(row.from_program_code) : null,
    fromProgramName: row.from_program_name != null ? String(row.from_program_name) : null,
    toProgramCode: row.to_program_code != null ? String(row.to_program_code) : null,
    toProgramName: row.to_program_name != null ? String(row.to_program_name) : null,
    fromClassCode: row.from_class_code != null ? String(row.from_class_code) : null,
    toClassCode: row.to_class_code != null ? String(row.to_class_code) : null,
    sessionsAtAction: row.sessions_at_action != null ? Number(row.sessions_at_action) : null,
    changedBy: row.changed_by != null ? String(row.changed_by) : null,
    changedByName: row.changed_by_name != null ? String(row.changed_by_name) : null,
    note,
    actionDate: row.action_date != null ? String(row.action_date) : '',
    isPlacementAdjust: Boolean(note?.includes('placement_adjusted')),
  };
}
