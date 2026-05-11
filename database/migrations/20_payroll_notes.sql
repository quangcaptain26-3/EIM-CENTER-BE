-- =============================================================================
-- EIM Migration 20: Ghi chú hậu chốt bảng lương (Q29) — không sửa tiền, chỉ notes.
-- staff_payroll_records đã có cột `note` (bắt buộc lúc insert); thêm `notes` tự do cho Admin/Kế toán.
-- =============================================================================

ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE staff_payroll_records
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN payroll_records.notes IS 'Q29: ghi chú đính chính sau chốt (nhầm tháng, hội đồng) — immutable số tiền';
COMMENT ON COLUMN staff_payroll_records.notes IS 'Q29: ghi chú bổ sung; cột `note` giữ mô tả slip khi chốt';
