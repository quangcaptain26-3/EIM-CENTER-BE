/**
 * Xem trước lương GV trước khi chốt (GET /payroll/preview — Q10, Q22).
 *
 * @see rules/06-teacher-salary.md — công thức gross v1, đếm main/cover/covered, preview vs finalize.
 * @see rules/EIM_SALARY_FOR_TEACHER.md — mô hình mở rộng (roadmap Phase B–E, chưa trong code).
 *
 * Cách vận hành:
 * - Nếu đã có `payroll_records` cho (teacherId, tháng, năm) → trả dữ liệu đã chốt (`isFinalized: true`),
 *   không tính lại từ session (bảng lương đã finalized là nguồn sự thật).
 * - Chưa chốt: chạy 3 truy vấn song song để tách minh bạch:
 *   (1) Buổi GV dạy chính và session không có `session_covers` trạng thái `completed`.
 *   (2) Buổi GV đi cover (join `session_covers` với `cover_teacher_id` = GV, cover + session đều `completed`).
 *   (3) Buổi GV là teacher_id nhưng đã có cover `completed` — chỉ để hiển thị “bị cover”, không cộng vào số buổi tính lương.
 * - `sessionsCount` = (1) + (2). `totalSalary` = sessionsCount × lương/buổi hiện tại + phụ cấp hiện tại
 *   (đây là ước tính; khi chốt, FinalizePayrollUseCase snapshot lại từ DB — xem finalize-payroll.usecase.ts).
 */
import { PayrollPeriodDto, PayrollPeriodSchema } from '../dtos/finance.dto';
import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';

export interface SessionPreviewItem {
  sessionId: string;
  sessionDate: Date;
  classCode: string;
  /** GV thực tế dạy buổi này */
  effectiveTeacherId: string;
  wasCover: boolean;
}

export interface PayrollPreview {
  teacherId: string;
  period: string;
  /** Tổng buổi tính lương (main + cover) */
  sessionsCount: number;
  /** Số buổi dạy chính (không bị cover) */
  sessionsAsMain: number;
  /** Số buổi đi cover người khác */
  sessionsAsCover: number;
  /** Số buổi bị người khác cover (không tính lương) */
  sessionsCovered: number;
  mainSessionDetails: SessionPreviewItem[];
  coverSessionDetails: SessionPreviewItem[];
  coveredSessionDetails: SessionPreviewItem[];
  salaryPerSession: number;
  allowance: number;
  totalSalary: number;
  isFinalized: boolean;
  /** Có khi đã chốt — để FE link /payroll/:id */
  finalizedPayrollId?: string;
}

export class PreviewPayrollUseCase {
  constructor(
    private readonly payrollRepo: IPayrollRepo,
    private readonly db: any,
  ) {}

  async execute(dto: PayrollPeriodDto): Promise<PayrollPreview> {
    const { teacherId, month, year } = PayrollPeriodSchema.parse(dto);

    const existing = await this.payrollRepo.findByTeacherAndPeriod(teacherId, month, year);
    if (existing) {
      return this.fromFinalized(existing, month, year);
    }

    // Rule tính lương tách 3 nhóm rõ ràng để FE hiển thị minh bạch.
    // Nếu muốn đổi định nghĩa "main / cover / covered", sửa 3 query bên dưới đồng thời.
    const [mainRes, coverRes, coveredRes] = await Promise.all([
      this.db.query(
        `SELECT
           s.id AS session_id,
           s.session_date,
           c.class_code,
           effective_teacher_id(s.id) AS effective_teacher_id
         FROM sessions s
         JOIN classes c ON c.id = s.class_id
         WHERE s.status = 'completed'
           AND date_trunc('month', s.session_date::date) = make_date($3::int, $2::int, 1)
           AND effective_teacher_id(s.id) = $1
           AND NOT EXISTS (
             SELECT 1 FROM session_covers sc
             WHERE sc.session_id = s.id AND sc.status = 'completed'
           )
         ORDER BY s.session_date, c.class_code`,
        [teacherId, month, year],
      ),
      this.db.query(
        `SELECT
           s.id AS session_id,
           s.session_date,
           c.class_code,
           effective_teacher_id(s.id) AS effective_teacher_id
         FROM session_covers sc
         JOIN sessions s ON s.id = sc.session_id
         JOIN classes c ON c.id = s.class_id
         WHERE sc.cover_teacher_id = $1
           AND sc.status = 'completed'
           AND s.status = 'completed'
           AND date_trunc('month', s.session_date::date) = make_date($3::int, $2::int, 1)
         ORDER BY s.session_date, c.class_code`,
        [teacherId, month, year],
      ),
      this.db.query(
        `SELECT
           s.id AS session_id,
           s.session_date,
           c.class_code,
           effective_teacher_id(s.id) AS effective_teacher_id
         FROM sessions s
         JOIN classes c ON c.id = s.class_id
         WHERE s.teacher_id = $1
           AND s.status = 'completed'
           AND date_trunc('month', s.session_date::date) = make_date($3::int, $2::int, 1)
           AND EXISTS (
             SELECT 1 FROM session_covers sc
             WHERE sc.session_id = s.id AND sc.status = 'completed'
           )
         ORDER BY s.session_date, c.class_code`,
        [teacherId, month, year],
      ),
    ]);

    const toItem = (row: any, wasCover: boolean): SessionPreviewItem => ({
      sessionId: row.session_id,
      sessionDate: row.session_date,
      classCode: row.class_code,
      effectiveTeacherId: row.effective_teacher_id,
      wasCover,
    });

    const mainSessionDetails: SessionPreviewItem[] = mainRes.rows.map((r: any) => toItem(r, false));
    const coverSessionDetails: SessionPreviewItem[] = coverRes.rows.map((r: any) => toItem(r, true));
    const coveredSessionDetails: SessionPreviewItem[] = coveredRes.rows.map((r: any) => toItem(r, true));

    const userRes = await this.db.query(
      `SELECT salary_per_session, allowance FROM users WHERE id = $1`,
      [teacherId],
    );
    const salaryPerSession = Number(userRes.rows[0]?.salary_per_session ?? 0);
    const allowance = Number(userRes.rows[0]?.allowance ?? 0);

    const sessionsAsMain = mainSessionDetails.length;
    const sessionsAsCover = coverSessionDetails.length;
    const sessionsCovered = coveredSessionDetails.length;
    const sessionsCount = sessionsAsMain + sessionsAsCover;
    const totalSalary = sessionsCount * salaryPerSession + allowance;

    return {
      teacherId,
      period: `${year}-${String(month).padStart(2, '0')}`,
      sessionsCount,
      sessionsAsMain,
      sessionsAsCover,
      sessionsCovered,
      mainSessionDetails,
      coverSessionDetails,
      coveredSessionDetails,
      salaryPerSession,
      allowance,
      totalSalary,
      isFinalized: false,
    };
  }

  private fromFinalized(
    payroll: import('../../../domain/finance/entities/payroll.entity').PayrollEntity,
    month: number,
    year: number,
  ): PayrollPreview {
    return {
      teacherId: payroll.teacherId,
      period: `${year}-${String(month).padStart(2, '0')}`,
      sessionsCount: payroll.sessionsCount,
      sessionsAsMain: payroll.sessionsCount,
      sessionsAsCover: 0,
      sessionsCovered: 0,
      mainSessionDetails: [],
      coverSessionDetails: [],
      coveredSessionDetails: [],
      salaryPerSession: payroll.salaryPerSessionSnapshot,
      allowance: payroll.allowanceSnapshot,
      totalSalary: payroll.totalSalary,
      isFinalized: true,
      finalizedPayrollId: payroll.id,
    };
  }
}
