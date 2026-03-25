import { Router } from "express";
import { FinanceController } from "./finance.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermissions, requireRoles } from "../../middlewares/rbac.middleware";
import { RBAC_PERMISSIONS } from "../../../../shared/security/rbac.policy";

export const financeRouter  = Router();
export const studentFinanceRouter = Router({ mergeParams: true });

const controller = new FinanceController();

// Chuẩn canonical: permission-based. Role chỉ còn phục vụ UI/UX coarse nếu cần.
const READ_PERMISSIONS = [RBAC_PERMISSIONS.FINANCE_READ];
const WRITE_PERMISSIONS = [RBAC_PERMISSIONS.FINANCE_WRITE];
// Defense-in-depth: siết thêm role cho các luồng WRITE tài chính để giảm rủi ro permission bị cấp sai.
const READ_ROLES = ['ROOT', 'DIRECTOR', 'ACADEMIC', 'ACCOUNTANT'];
const WRITE_ROLES = ['ROOT', 'ACCOUNTANT'];

// ==========================================
// FEE PLANS (/api/v1/finance/fee-plans)
// ==========================================

// GET /finance/fee-plans - ACADEMIC + ACCOUNTANT + DIRECTOR + ROOT
financeRouter.get(
  "/fee-plans",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.listFeePlans.bind(controller)
);

// POST /finance/fee-plans - ACCOUNTANT + ROOT
financeRouter.post(
  "/fee-plans",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  controller.createFeePlan.bind(controller)
);

// PATCH /finance/fee-plans/:id - ACCOUNTANT + ROOT
financeRouter.patch(
  "/fee-plans/:id",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  controller.updateFeePlan.bind(controller)
);

// DELETE /finance/fee-plans/:id
financeRouter.delete(
  "/fee-plans/:id",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  controller.deleteFeePlan.bind(controller)
);

// ==========================================
// INVOICES (/api/v1/finance/invoices)
// ==========================================

// GET /finance/invoices
financeRouter.get(
  "/invoices",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.listInvoices.bind(controller)
);

// GET /finance/invoices/export
financeRouter.get(
  "/invoices/export",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.exportInvoices.bind(controller)
);

// POST /finance/invoices
financeRouter.post(
  "/invoices",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  controller.createInvoice.bind(controller)
);

// GET /finance/invoices/:id
financeRouter.get(
  "/invoices/:id",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.getInvoice.bind(controller)
);

// PATCH /finance/invoices/:id/status
financeRouter.patch(
  "/invoices/:id/status",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  controller.updateInvoiceStatus.bind(controller)
);

// ==========================================
// PAYMENTS (/api/v1/finance/payments)
// ==========================================

// POST /finance/payments
// GET /finance/payments/export
financeRouter.get(
  "/payments/export",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.exportPayments.bind(controller),
);

financeRouter.post(
  "/payments",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  controller.createPayment.bind(controller)
);

// ==========================================
// DANH SÁCH TRẠNG THÁI THANH TOÁN HỌC SINH
// GET /finance/student-payment-status
// ==========================================

// Export phải đứng trước /student-payment-status để không bị match nhầm
financeRouter.get(
  "/student-payment-status/export",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.exportStudentPaymentStatus.bind(controller)
);

financeRouter.get(
  "/student-payment-status",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.listStudentPaymentStatus.bind(controller)
);

// ==========================================
// STUDENT FINANCE (mounted on /api/v1/students/:id)
// ==========================================

// GET /students/:id/finance
studentFinanceRouter.get(
  "/finance",
  authMiddleware,
  requireRoles(READ_ROLES),
  requirePermissions(READ_PERMISSIONS),
  controller.getStudentFinance.bind(controller)
);
