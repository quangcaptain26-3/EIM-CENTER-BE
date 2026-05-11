-- =============================================================================
-- EIM Migration 08: Finance — receipts, refund_requests
-- Depends on: 06_students.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- receipts — phiếu thu / phiếu âm (hoàn tiền)
-- Nguyên tắc: KHÔNG BAO GIỜ DELETE. Hoàn tiền → tạo phiếu âm mới.
-- ---------------------------------------------------------------------------
CREATE TABLE receipts (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_code         VARCHAR(20)  UNIQUE NOT NULL,  -- EIM-PT-xxxxx
  payer_name           VARCHAR(200) NOT NULL,
  payer_address        TEXT,
  student_id           UUID         NOT NULL REFERENCES students(id),
  enrollment_id        UUID         NOT NULL REFERENCES enrollments(id),
  reason               TEXT         NOT NULL,
  amount               DECIMAL(12,0) NOT NULL,   -- dương = thu; âm = hoàn/void
  amount_in_words      VARCHAR(500),              -- auto-generated bởi app layer
  payment_method       VARCHAR(20)  CHECK (payment_method IN ('cash','transfer')),
  payment_date         DATE         NOT NULL,
  note                 TEXT,
  created_by           UUID         NOT NULL REFERENCES users(id),
  payer_signature_name VARCHAR(200),
  voided_by_receipt_id UUID         REFERENCES receipts(id),  -- phiếu âm → trỏ về phiếu gốc
  transfer_group_id    UUID,                                  -- nhóm transaction chuyển nhượng
  created_at           TIMESTAMPTZ  DEFAULT now()
  -- Không có deleted_at. Không có updated_at. Phiếu là IMMUTABLE sau khi tạo.
);

-- ---------------------------------------------------------------------------
-- refund_requests — yêu cầu hoàn học phí
-- ---------------------------------------------------------------------------
CREATE TABLE refund_requests (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_code  VARCHAR(20)  UNIQUE NOT NULL,  -- EIM-HP-xxxxx
  enrollment_id UUID         NOT NULL REFERENCES enrollments(id),
  reason_type   VARCHAR(50)  NOT NULL CHECK (reason_type IN (
    'center_unable_to_open',       -- Trung tâm không khai giảng được
    'subjective_no_interest',      -- Học sinh không muốn học
    'subjective_schedule_conflict',-- Bận lịch
    'subjective_financial',        -- Khó khăn tài chính
    'subjective_relocation',       -- Chuyển nơi ở
    'subjective_other',            -- Lý do chủ quan khác
    'special_case'                 -- Trường hợp đặc biệt
  )),
  reason_detail TEXT         NOT NULL,
  refund_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
  status        VARCHAR(20)  DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','completed')),
  requested_by  UUID         NOT NULL REFERENCES users(id),
  reviewed_by   UUID         REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT,
  receipt_id    UUID         REFERENCES receipts(id),  -- phiếu âm khi hoàn tiền thực tế
  created_at    TIMESTAMPTZ  DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_receipts_enrollment ON receipts(enrollment_id);
CREATE INDEX idx_receipts_student    ON receipts(student_id);
CREATE INDEX idx_receipts_date       ON receipts(payment_date);
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX idx_refund_enrollment   ON refund_requests(enrollment_id);
CREATE INDEX idx_refund_status       ON refund_requests(status);

-- Thêm FK sau khi receipts đã tồn tại (transfer_requests tạo ở migration 06)
ALTER TABLE transfer_requests
  ADD CONSTRAINT fk_tr_debit  FOREIGN KEY (debit_receipt_id)  REFERENCES receipts(id),
  ADD CONSTRAINT fk_tr_credit FOREIGN KEY (credit_receipt_id) REFERENCES receipts(id);

-- ---------------------------------------------------------------------------
-- Hàm tính công nợ còn lại của 1 enrollment (phụ thuộc enrollments + receipts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enrollment_debt(p_enrollment_id UUID)
RETURNS DECIMAL(12,0) LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT tuition_fee FROM enrollments WHERE id = p_enrollment_id), 0
  ) - COALESCE(
    (SELECT SUM(amount) FROM receipts WHERE enrollment_id = p_enrollment_id), 0
  );
$$;
