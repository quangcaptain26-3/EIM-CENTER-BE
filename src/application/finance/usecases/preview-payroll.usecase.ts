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

    const sessionsRes = await this.db.query(
      `SELECT
         s.id            AS session_id,
         s.session_date,
         s.teacher_id    AS original_teacher_id,
         c.class_code,
         COALESCE(sc.cover_teacher_id, s.teacher_id) AS effective_teacher_id,
         sc.cover_teacher_id
       FROM sessions s
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN session_covers sc
         ON sc.session_id = s.id AND sc.status = 'completed'
       WHERE s.status = 'completed'
         AND date_trunc('month', s.session_date::date) = make_date($3::int, $2::int, 1)
         AND (s.teacher_id = $1 OR sc.cover_teacher_id = $1)`,
      [teacherId, month, year],
    );

    const mainSessionDetails: SessionPreviewItem[] = [];
    const coverSessionDetails: SessionPreviewItem[] = [];
    const coveredSessionDetails: SessionPreviewItem[] = [];

    for (const row of sessionsRes.rows) {
      const item: SessionPreviewItem = {
        sessionId: row.session_id,
        sessionDate: row.session_date,
        classCode: row.class_code,
        effectiveTeacherId: row.effective_teacher_id,
        wasCover: !!row.cover_teacher_id,
      };

      if (row.effective_teacher_id === teacherId && !row.cover_teacher_id) {
        mainSessionDetails.push(item);
      } else if (row.cover_teacher_id === teacherId) {
        coverSessionDetails.push({ ...item, wasCover: true });
      } else if (row.original_teacher_id === teacherId && row.cover_teacher_id) {
        coveredSessionDetails.push(item);
      }
    }

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
