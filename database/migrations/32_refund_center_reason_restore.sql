-- =============================================================================
-- EIM Migration 32: Restore center_unable_to_open in refund reason CHECK
-- Aligns with drop-enrollment + create-refund-request (nghiệp vụ hoàn phí TH1)
-- =============================================================================

ALTER TABLE refund_requests
  DROP CONSTRAINT IF EXISTS refund_requests_reason_type_check;

ALTER TABLE refund_requests
  ADD CONSTRAINT refund_requests_reason_type_check
  CHECK (
    reason_type IN (
      'center_unable_to_open',
      'center_unable_within_60days',
      'subjective_no_interest',
      'subjective_schedule_conflict',
      'subjective_financial',
      'subjective_relocation',
      'subjective_other',
      'special_case'
    )
  );
