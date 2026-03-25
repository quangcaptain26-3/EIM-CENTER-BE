import type { SessionType } from '../../sessions/entities/session.entity';

export type AssessmentSessionSpec = {
  unitNo: number;
  sessionType: Exclude<SessionType, 'NORMAL'>;
};

/**
 * Rule sinh các buổi khảo thí (TEST/MIDTERM/FINAL) theo tổng số Unit của chương trình.
 *
 * Mục tiêu:
 * - Loại bỏ hardcode kiểu "unit 2 = TEST, unit 6 = MIDTERM, unit 12 = FINAL".
 * - Vẫn giữ được behavior cũ khi totalUnits = 12 (2/6/12).
 * - Dễ giải thích, deterministic, không phụ thuộc dữ liệu payload.
 */
export function buildAssessmentSessions(totalUnits: number): AssessmentSessionSpec[] {
  if (!Number.isFinite(totalUnits) || totalUnits <= 0) return [];

  const maxUnitNo = Math.floor(totalUnits);

  // FINAL: luôn gắn ở unit cuối (nếu có).
  const finalUnitNo = maxUnitNo;

  // MIDTERM: unit giữa (làm tròn xuống để không vượt).
  // Ví dụ totalUnits=12 => 6, totalUnits=10 => 5.
  const midtermUnitNo = Math.max(1, Math.floor(maxUnitNo / 2));

  // TEST (quiz nhỏ): giữ tương thích backward với chương trình 12 units là unit 2.
  // Với chương trình nhỏ, đặt ở unit 2 nếu tồn tại, còn không thì bỏ qua.
  const testUnitNo = maxUnitNo >= 2 ? 2 : 0;

  const specs: AssessmentSessionSpec[] = [];
  if (testUnitNo > 0) specs.push({ unitNo: testUnitNo, sessionType: 'TEST' });
  if (midtermUnitNo > 0 && midtermUnitNo !== testUnitNo) {
    specs.push({ unitNo: midtermUnitNo, sessionType: 'MIDTERM' });
  }
  if (finalUnitNo > 0 && finalUnitNo !== midtermUnitNo && finalUnitNo !== testUnitNo) {
    specs.push({ unitNo: finalUnitNo, sessionType: 'FINAL' });
  }

  // Sắp xếp theo unitNo tăng dần để dễ chèn vào plan.
  return specs.sort((a, b) => a.unitNo - b.unitNo);
}

/**
 * Tính session_type theo unit/lesson và tổng unit chương trình (đồng bộ với buildAssessmentSessions).
 * - lessonNo > 0 → NORMAL
 * - lessonNo === 0 → TEST / MIDTERM / FINAL nếu trùng milestone, ngược lại NORMAL
 */
export function resolveSessionTypeFromCurriculum(
  unitNo: number,
  lessonNo: number,
  totalUnits: number,
): SessionType {
  if (lessonNo !== 0) {
    return 'NORMAL';
  }
  const specs = buildAssessmentSessions(totalUnits);
  const match = specs.find((s) => s.unitNo === unitNo);
  if (match) {
    return match.sessionType;
  }
  return 'NORMAL';
}
