/**
 * Chốt lương giáo viên theo tháng/năm (nghiệp vụ Q10, Q22, Q38 trong rules/EIM_QA_USECASES.md).
 *
 * Cách vận hành:
 * - Gọi PreviewPayrollUseCase trước: đếm các session `completed` trong tháng mà GV được tính tiền
 *   (buổi dạy chính không bị cover + buổi đi cover người khác; buổi bị người khác cover không tính).
 *   Logic khớp với hàm SQL `effective_teacher_id(session_id)` (cover `completed` → lương thuộc GV cover).
 * - Nếu tháng đó đã có bản ghi `payroll_records` → preview báo `isFinalized` → use case trả lỗi 409 (hai kế toán
 *   chốt cùng lúc cũng va chạm UNIQUE ở DB).
 * - **Quan trọng (Q22):** `salary_per_session` và `allowance` được đọc lại từ bảng `users` ngay tại bước chốt,
 *   rồi ghi snapshot vào `payroll_records` + chi tiết từng buổi — không dùng lại con số preview cũ.
 *
 * Công thức lương GV (đúng với code dưới đây và OVERVIEW_EIM_v5 §9.2):
 *   Tổng lương = (số buổi tính lương) × salary_per_session_snapshot + allowance_snapshot
 * Trong đó số buổi = số dòng main (không có cover completed) + số dòng cover (GV là cover_teacher).
 */
import { PayrollPeriodDto, PayrollPeriodSchema } from '../dtos/finance.dto';
import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { PreviewPayrollUseCase } from './preview-payroll.usecase';

export class FinalizePayrollUseCase {
  constructor(
    private readonly payrollRepo: IPayrollRepo,
    private readonly previewPayrollUseCase: PreviewPayrollUseCase,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly db: any,
  ) {}

  async execute(
    dto: PayrollPeriodDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    if (!['ACCOUNTANT', 'ADMIN'].includes(actor.role)) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ACCOUNTANT hoặc ADMIN mới có thể chốt lương',
        403,
      );
    }

    const { teacherId, month, year } = PayrollPeriodSchema.parse(dto);

    // 1. Preview (includes already-finalized check)
    const preview = await this.previewPayrollUseCase.execute({ teacherId, month, year });

    // 2. Guard: đã chốt rồi
    if (preview.isFinalized) {
      throw new AppError(
        ERROR_CODES.PAYROLL_ALREADY_FINALIZED,
        `Bảng lương tháng ${month}/${year} của giáo viên này đã được chốt`,
        409,
      );
    }

    // 3. Snapshot salary NGAY LÚC CHỐT (query lại, không dùng preview value)
    const userRes = await this.db.query(
      `SELECT salary_per_session, allowance FROM users WHERE id = $1`,
      [teacherId],
    );
    const salaryPerSessionSnapshot = Number(userRes.rows[0]?.salary_per_session ?? 0);
    const allowanceSnapshot        = Number(userRes.rows[0]?.allowance ?? 0);

    const sessionsCount = preview.sessionsCount;
    const totalSalary   = sessionsCount * salaryPerSessionSnapshot + allowanceSnapshot;
    const payrollCode   = generateEimCode('PL');
    const finalizedAt   = new Date();

    // 4. Merge session details từ preview
    const allSessions = [
      ...preview.mainSessionDetails.map((s) => ({ ...s, wasCover: false })),
      ...preview.coverSessionDetails.map((s) => ({ ...s, wasCover: true })),
    ];

    // 5. createWithDetails (transaction)
    const payroll = await this.payrollRepo.createWithDetails(
      {
        payrollCode,
        teacherId,
        periodMonth:              month,
        periodYear:               year,
        sessionsCount,
        salaryPerSessionSnapshot,
        allowanceSnapshot,
        totalSalary,
        finalizedBy:              actor.id,
        finalizedAt,
      },
      allSessions.map((s) => ({
        sessionId:   s.sessionId,
        sessionDate: s.sessionDate,
        classCode:   s.classCode,
        wasCover:    s.wasCover,
      })),
    );

    // 6. Audit log
    await this.auditLogRepo.log({
      action:     'FINANCE:payroll_finalized',
      actorId:    actor.id,
      actorRole:  actor.role,
      actorIp:    actor.ip,
      entityType: 'payroll',
      entityId:   payroll.id,
      entityCode: payroll.payrollCode,
      description: `Chốt lương ${payrollCode} — GV ${teacherId} — ${month}/${year} — ${totalSalary.toLocaleString('vi-VN')}đ`,
    });

    return payroll;
  }
}
