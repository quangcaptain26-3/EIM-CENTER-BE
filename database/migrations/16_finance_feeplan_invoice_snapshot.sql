SET client_encoding = 'UTF8';

-- ============================================================
-- PART 9.4 Finance Journey Guards
-- Mục tiêu:
-- - Program.fee_plan_id có FK rõ ràng tới finance_fee_plans (giảm drift cấu hình)
-- - Invoice snapshot fee_plan_id + currency để audit/renewal không bị drift
-- ============================================================

BEGIN;

-- 1) Curriculum program fee_plan_id -> finance_fee_plans(id)
DO $$
BEGIN
  ALTER TABLE curriculum_programs
    ADD CONSTRAINT fk_curriculum_programs_fee_plan
    FOREIGN KEY (fee_plan_id)
    REFERENCES finance_fee_plans(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN
    -- constraint đã tồn tại, bỏ qua
    NULL;
END $$;

-- 2) Invoice snapshot columns
ALTER TABLE finance_invoices
  ADD COLUMN IF NOT EXISTS fee_plan_id UUID NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'VND';

DO $$
BEGIN
  ALTER TABLE finance_invoices
    ADD CONSTRAINT fk_finance_invoices_fee_plan
    FOREIGN KEY (fee_plan_id)
    REFERENCES finance_fee_plans(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_fee_plan_id
  ON finance_invoices(fee_plan_id);

COMMIT;

