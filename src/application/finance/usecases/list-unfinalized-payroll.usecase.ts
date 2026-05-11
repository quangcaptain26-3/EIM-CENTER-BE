import { ListUnfinalizedPayrollSchema, ListUnfinalizedPayrollDto } from '../dtos/finance.dto';
import { PreviewPayrollUseCase } from './preview-payroll.usecase';

/** Một dòng danh sách "chờ chốt" — khớp cấu trúc payroll_records + cờ isPending để FE phân biệt. */
export type UnfinalizedPayrollListRow = {
  id: string;
  payrollCode: string;
  teacherId: string;
  periodMonth: number;
  periodYear: number;
  sessionsCount: number;
  salaryPerSessionSnapshot: number;
  allowanceSnapshot: number;
  totalSalary: number;
  finalizedBy: string;
  finalizedAt: string | null;
  isPending: true;
};

/**
 * GV có buổi tính lương trong tháng nhưng chưa có payroll_records — dùng màn "Chờ chốt".
 * Định nghĩa "có buổi tính lương" phải trùng PreviewPayrollUseCase — nếu đổi rule lương: sửa SQL EXISTS và preview cùng lúc.
 */
export class ListUnfinalizedPayrollUseCase {
  constructor(
    private readonly db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
    private readonly previewPayroll: PreviewPayrollUseCase,
  ) {}

  async execute(raw: unknown, actor: { id: string; role: string }) {
    const q = ListUnfinalizedPayrollSchema.parse(raw) as ListUnfinalizedPayrollDto;
    const { month, year, page, limit } = q;
    const r = String(actor.role || '').toUpperCase();
    // GV chỉ xem dòng của mình (read_own) — bỏ qua teacherId trên query để chặn IDOR. Admin/Kế toán: filter theo query.
    const teacherId = r === 'TEACHER' ? actor.id : q.teacherId ?? null;
    const offset = (page - 1) * limit;

    const countRes = await this.db.query(
      `
      SELECT COUNT(*)::int AS c
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'TEACHER'
        AND u.deleted_at IS NULL
        AND u.is_active = true
        AND ($3::uuid IS NULL OR u.id = $3::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM payroll_records pr
          WHERE pr.teacher_id = u.id AND pr.period_month = $1 AND pr.period_year = $2
        )
        AND (
          EXISTS (
            SELECT 1
            FROM sessions s
            WHERE s.status = 'completed'
              AND date_trunc('month', s.session_date::date) = make_date($2::int, $1::int, 1)
              AND effective_teacher_id(s.id) = u.id
              AND NOT EXISTS (
                SELECT 1 FROM session_covers sc
                WHERE sc.session_id = s.id AND sc.status = 'completed'
              )
          )
          OR EXISTS (
            SELECT 1
            FROM session_covers sc
            INNER JOIN sessions s ON s.id = sc.session_id
            WHERE sc.cover_teacher_id = u.id
              AND sc.status = 'completed'
              AND s.status = 'completed'
              AND date_trunc('month', s.session_date::date) = make_date($2::int, $1::int, 1)
          )
        )
      `,
      [month, year, teacherId ?? null],
    );
    const total = Number((countRes.rows[0] as { c?: number } | undefined)?.c ?? 0);

    const idsRes = await this.db.query(
      `
      SELECT u.id
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'TEACHER'
        AND u.deleted_at IS NULL
        AND u.is_active = true
        AND ($3::uuid IS NULL OR u.id = $3::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM payroll_records pr
          WHERE pr.teacher_id = u.id AND pr.period_month = $1 AND pr.period_year = $2
        )
        AND (
          EXISTS (
            SELECT 1
            FROM sessions s
            WHERE s.status = 'completed'
              AND date_trunc('month', s.session_date::date) = make_date($2::int, $1::int, 1)
              AND effective_teacher_id(s.id) = u.id
              AND NOT EXISTS (
                SELECT 1 FROM session_covers sc
                WHERE sc.session_id = s.id AND sc.status = 'completed'
              )
          )
          OR EXISTS (
            SELECT 1
            FROM session_covers sc
            INNER JOIN sessions s ON s.id = sc.session_id
            WHERE sc.cover_teacher_id = u.id
              AND sc.status = 'completed'
              AND s.status = 'completed'
              AND date_trunc('month', s.session_date::date) = make_date($2::int, $1::int, 1)
          )
        )
      ORDER BY u.full_name ASC
      LIMIT $4 OFFSET $5
      `,
      [month, year, teacherId ?? null, limit, offset],
    );

    const rows: UnfinalizedPayrollListRow[] = [];
    for (const row of idsRes.rows) {
      const tid = String(row.id);
      const preview = await this.previewPayroll.execute({ teacherId: tid, month, year });
      if (preview.isFinalized) continue;
      rows.push({
        id: `pending:${tid}:${year}-${String(month).padStart(2, '0')}`,
        payrollCode: '',
        teacherId: tid,
        periodMonth: month,
        periodYear: year,
        sessionsCount: preview.sessionsCount,
        salaryPerSessionSnapshot: preview.salaryPerSession,
        allowanceSnapshot: preview.allowance,
        totalSalary: preview.totalSalary,
        finalizedBy: '',
        finalizedAt: null,
        isPending: true,
      });
    }

    return { data: rows, total, page, limit };
  }
}
