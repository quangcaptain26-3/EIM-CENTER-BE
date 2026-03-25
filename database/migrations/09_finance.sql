-- Mô tả: Module tài chính — fee plans, invoices, payments (FK curriculum_programs, enrollments).

-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bảng finance_fee_plans: Kế hoạch học phí / gói học phí
CREATE TABLE IF NOT EXISTS finance_fee_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES curriculum_programs(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    amount INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    sessions_per_week INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id, name),
    CONSTRAINT finance_fee_plans_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_finance_fee_plans_program_id ON finance_fee_plans(program_id);

-- Bảng finance_invoices: Hóa đơn học phí
CREATE TABLE IF NOT EXISTS finance_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
    amount INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ISSUED, PAID, OVERDUE, CANCELED
    due_date DATE NOT NULL,
    issued_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_invoices_status_check CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELED')),
    CONSTRAINT finance_invoices_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_finance_invoices_enrollment_id ON finance_invoices(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_status ON finance_invoices(status);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_due_date ON finance_invoices(due_date);

-- Bảng finance_payments: Thanh toán hóa đơn
CREATE TABLE IF NOT EXISTS finance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES finance_invoices(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    method TEXT NOT NULL, -- CASH, TRANSFER, CARD, OTHER
    paid_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_payments_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_finance_payments_invoice_id ON finance_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_paid_at ON finance_payments(paid_at);

-- Down Migration
-- DROP TABLE IF EXISTS finance_payments;
-- DROP TABLE IF EXISTS finance_invoices;
-- DROP TABLE IF EXISTS finance_fee_plans;
