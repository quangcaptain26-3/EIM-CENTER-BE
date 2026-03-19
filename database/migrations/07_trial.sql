-- Tạo extension pgcrypto nếu chưa có
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bảng lưu trữ khách hàng tiềm năng học thử (Trial Leads)
CREATE TABLE trial_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NULL,
    source TEXT NULL, -- facebook, referral, walk-in...
    status TEXT NOT NULL DEFAULT 'NEW',
    note TEXT NULL,
    created_by UUID NULL REFERENCES auth_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_trial_leads_status CHECK (status IN ('NEW', 'CONTACTED', 'SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CONVERTED', 'CLOSED'))
);

-- Tạo chỉ mục để truy vấn nhanh qua phone và status
CREATE INDEX idx_trial_leads_phone ON trial_leads(phone);
CREATE INDEX idx_trial_leads_status ON trial_leads(status);

-- Bảng quản lý đặt lịch học thử (Trial Schedules)
CREATE TABLE trial_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id UUID NOT NULL REFERENCES trial_leads(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    trial_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trial_id)
);

-- Tạo chỉ mục theo class_id và trial_date
CREATE INDEX idx_trial_schedules_class_id ON trial_schedules(class_id);
CREATE INDEX idx_trial_schedules_trial_date ON trial_schedules(trial_date);

-- Bảng quản lý kết quả chuyển đổi học viên (Trial Conversions)
CREATE TABLE trial_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id UUID NOT NULL REFERENCES trial_leads(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
    converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trial_id)
);
