import { AppError } from "../../../shared/errors/app-error";
import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { FeePlanRepoPort } from "../../../domain/finance/repositories/fee-plan.repo.port";
import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ProgramRepoPort } from "../../../domain/curriculum/repositories/program.repo.port";
import { CreateInvoiceBody } from "../dtos/invoice.dto";
import { mapInvoice } from "../mappers/finance.mapper";

/**
 * UseCase: Tạo mới Hóa đơn học phí.
 * Hóa đơn mới mặc định có status DRAFT.
 */
export class CreateInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly classRepo: ClassRepoPort,
    private readonly programRepo: ProgramRepoPort,
    private readonly feePlanRepo: FeePlanRepoPort,
  ) {}

  async execute(body: CreateInvoiceBody) {
    // Resolve snapshot feePlanId + currency từ Program (best-effort).
    // - Nếu không truyền amount: bắt buộc resolve được fee plan để lấy amount.
    // - Nếu có truyền amount: vẫn cố resolve fee plan để snapshot currency/feePlanId (không bắt buộc).
    let feePlanId: string | null = null;
    let currency: string | null = "VND";
    let amount: number | undefined = body.amount;

    const enrollment = await this.enrollmentRepo.findById(body.enrollmentId);
    if (!enrollment) {
      throw AppError.notFound("Không tìm thấy enrollment để tạo hóa đơn");
    }
    if (!enrollment.classId) {
      if (amount === undefined) {
        throw AppError.badRequest("Enrollment chưa được xếp lớp nên chưa resolve được FeePlan của Program", {
          code: "FINANCE/ENROLLMENT_CLASS_REQUIRED_FOR_FEEPLAN",
          enrollmentId: body.enrollmentId,
        });
      }
      // Có truyền amount: cho phép tạo invoice thủ công, giữ snapshot currency mặc định.
      feePlanId = null;
      currency = "VND";
    } else {
      const cls = await this.classRepo.findById(enrollment.classId);
      if (!cls) {
        if (amount === undefined) {
          throw AppError.badRequest("Class của enrollment không tồn tại", {
            code: "FINANCE/CLASS_NOT_FOUND",
            classId: enrollment.classId,
          });
        }
      } else {
        const program = await this.programRepo.findProgramById(cls.programId);
        if (!program) {
          if (amount === undefined) {
            throw AppError.badRequest("Program của class không tồn tại", {
              code: "FINANCE/PROGRAM_NOT_FOUND",
              programId: cls.programId,
            });
          }
        } else {
          feePlanId = program.feePlanId ?? null;
          if (!feePlanId) {
            if (amount === undefined) {
              throw AppError.badRequest("Program chưa được gắn feePlanId nên không thể tự tạo hóa đơn", {
                code: "FINANCE/FEE_PLAN_NOT_CONFIGURED",
                programId: program.id,
              });
            }
          } else {
            const feePlan = await this.feePlanRepo.findById(feePlanId);
            if (!feePlan) {
              if (amount === undefined) {
                throw AppError.badRequest("feePlanId trên Program không tồn tại trong finance_fee_plans", {
                  code: "FINANCE/FEE_PLAN_NOT_FOUND",
                  feePlanId,
                });
              }
            } else {
              currency = feePlan.currency;
              if (amount === undefined) {
                amount = feePlan.amount;
              }
            }
          }
        }
      }
    }

    if (amount === undefined) {
      // Defensive: amount bắt buộc phải resolve được (do schema DB check amount > 0).
      throw AppError.badRequest("Không thể resolve số tiền hóa đơn", {
        code: "FINANCE/INVOICE_AMOUNT_REQUIRED",
        enrollmentId: body.enrollmentId,
      });
    }

    const invoice = await this.invoiceRepo.create({
      enrollmentId: body.enrollmentId,
      feePlanId,
      currency,
      amount:       amount,
      dueDate:      new Date(body.dueDate),
      status:       "DRAFT",
    });
    return mapInvoice(invoice);
  }
}
