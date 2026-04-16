import { Request, Response } from 'express';
import { sendErrorResponse } from '../../utils/http-error.util';
import { ERROR_CODES } from '../../../../shared/errors/error-codes';

// ── Helper ────────────────────────────────────────────────────────────────────

function actor(req: Request) {
  return {
    id:   (req as any).user.id,
    role: (req as any).user.role,
    ip:   req.ip,
  };
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createFinanceController(
  createReceiptUsecase:     any,
  voidReceiptUsecase:       any,
  listReceiptsUsecase:      any,
  receiptRepo:              any,
  getDebtUsecase:           any,
  listPaymentStatusUsecase: any,
  financeDashboardUsecase:  any,
) {
  return {

    // ── Receipts ──────────────────────────────────────────────────────────

    /** POST /receipts */
    createReceipt: async (req: Request, res: Response) => {
      try {
        const result = await createReceiptUsecase.execute(req.body, actor(req));
        res.status(201).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** POST /receipts/:id/void */
    voidReceipt: async (req: Request, res: Response) => {
      try {
        const result = await voidReceiptUsecase.execute(
          req.params.id,
          actor(req),
          req.body,
        );
        res.status(201).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** GET /receipts */
    listReceipts: async (req: Request, res: Response) => {
      try {
        const result = await listReceiptsUsecase.execute(req.query);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** GET /receipts/:id */
    getReceipt: async (req: Request, res: Response) => {
      try {
        const receipt = await receiptRepo.findById(req.params.id);
        if (!receipt) {
          return res.status(404).json({
            code: ERROR_CODES.RECEIPT_NOT_FOUND,
            message: 'Không tìm thấy phiếu thu',
          });
        }
        res.status(200).json(receipt);
      } catch (e) { sendErrorResponse(res, e); }
    },

    // ── Finance Analytics ─────────────────────────────────────────────────

    /** GET /enrollments/:id/debt */
    getDebt: async (req: Request, res: Response) => {
      try {
        const result = await getDebtUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** GET /finance/payment-status */
    listPaymentStatus: async (req: Request, res: Response) => {
      try {
        const result = await listPaymentStatusUsecase.execute(req.query);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /**
     * GET /finance/dashboard
     * Query: month, year  |  quarter, year  |  yearFrom, yearTo, year
     */
    financeDashboard: async (req: Request, res: Response) => {
      try {
        const result = await financeDashboardUsecase.execute(req.query);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },
  };
}

// ── Payroll factory (separate to stay under 150 LOC) ─────────────────────────

export function createPayrollController(
  previewPayrollUsecase:   any,
  finalizePayrollUsecase:  any,
  listPayrollsUsecase:     any,
  getPayrollUsecase:       any,
) {
  return {

    /** GET /payroll/preview?teacherId=&month=&year= */
    previewPayroll: async (req: Request, res: Response) => {
      try {
        const result = await previewPayrollUsecase.execute(req.query);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** POST /payroll/finalize  body: { teacherId, month, year } */
    finalizePayroll: async (req: Request, res: Response) => {
      try {
        const result = await finalizePayrollUsecase.execute(req.body, actor(req));
        res.status(201).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** GET /payroll?teacherId=&month=&year=&page=&limit= */
    listPayrolls: async (req: Request, res: Response) => {
      try {
        const result = await listPayrollsUsecase.execute(req.query);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },

    /** GET /payroll/:id */
    getPayroll: async (req: Request, res: Response) => {
      try {
        const result = await getPayrollUsecase.execute(req.params.id);
        res.status(200).json(result);
      } catch (e) { sendErrorResponse(res, e); }
    },
  };
}
