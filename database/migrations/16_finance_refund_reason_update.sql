-- =============================================================================
-- EIM Migration 16: Refund reason rule update
-- =============================================================================

-- Chuẩn hóa enum lý do hoàn học phí theo rules/12-refee-usecases.md.
-- Muốn đổi danh sách lý do về sau: sửa CHECK này + enum validate ở refund.dto.ts.
ALTER TABLE refund_requests
  DROP CONSTRAINT IF EXISTS refund_requests_reason_type_check;

ALTER TABLE refund_requests
  ADD CONSTRAINT refund_requests_reason_type_check
  CHECK (
    reason_type IN (
      'center_unable_within_60days',
      'subjective_no_interest',
      'subjective_schedule_conflict',
      'subjective_financial',
      'subjective_relocation',
      'subjective_other',
      'special_case'
    )
  );
