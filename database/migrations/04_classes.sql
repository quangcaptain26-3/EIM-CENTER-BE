-- Kích hoạt extension pgcrypto để dùng gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng classes (Lớp học)
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    program_id UUID NOT NULL REFERENCES curriculum_programs(id) ON DELETE RESTRICT,
    room TEXT NULL,
    capacity INT NOT NULL DEFAULT 16,
    start_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index cho program_id để tối ưu truy vấn
CREATE INDEX idx_classes_program_id ON classes(program_id);

-- Tạo bảng class_schedules (Lịch học của lớp)
CREATE TABLE class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    weekday INT NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1..7 (Thứ 2 đến Chủ nhật)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(class_id, weekday, start_time)
);

-- Index cho class_id
CREATE INDEX idx_class_schedules_class_id ON class_schedules(class_id);

-- Tạo bảng class_staff (Giáo viên phụ trách lớp)
CREATE TABLE class_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('MAIN', 'TA')), -- Giáo viên chính (MAIN) | Trợ giảng (TA)
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(class_id, user_id, type)
);

-- Index cho class_id và user_id
CREATE INDEX idx_class_staff_class_id ON class_staff(class_id);
CREATE INDEX idx_class_staff_user_id ON class_staff(user_id);
