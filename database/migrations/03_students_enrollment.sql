SET client_encoding = 'UTF8';

-- Xóa bảng cũ nếu tồn tại (để tránh xung đột nếu lần trước chạy lỗi)
DROP TABLE IF EXISTS enrollment_history CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;

-- Đảm bảo có extension pgcrypto để sử dụng hàm gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng students (Học viên)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    dob DATE NULL,
    gender TEXT NULL,
    phone TEXT NULL,
    email TEXT NULL,
    guardian_name TEXT NULL,
    guardian_phone TEXT NULL,
    address TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index gợi ý cho số điện thoại và email
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Tạo bảng enrollments (Đăng ký học)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL, -- Sẽ bổ sung khóa ngoại sau khi bảng lớp học được tạo (Module 4)
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'DROPPED', 'TRANSFERRED', 'GRADUATED')), -- Trạng thái
    start_date DATE NOT NULL,
    end_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho học viên và lớp học để dễ truy vấn
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);

-- Tạo bảng enrollment_history (Lịch sử đăng ký học)
CREATE TABLE IF NOT EXISTS enrollment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL CHECK (from_status IN ('ACTIVE', 'PAUSED', 'DROPPED', 'TRANSFERRED', 'GRADUATED')),
    to_status TEXT NOT NULL CHECK (to_status IN ('ACTIVE', 'PAUSED', 'DROPPED', 'TRANSFERRED', 'GRADUATED')),
    note TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho enrollment_id
CREATE INDEX IF NOT EXISTS idx_enrollment_history_enrollment_id ON enrollment_history(enrollment_id);
