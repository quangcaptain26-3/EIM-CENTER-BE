-- Mô tả: Unique partial index — chỉ một enrollment ACTIVE/PAUSED trên mỗi học sinh.

-- migration: 25_enrollment_one_active_per_student.sql
-- Mục tiêu: Chặn parallel enrollment — 1 học sinh chỉ có tối đa 1 enrollment ACTIVE/PAUSED.
-- Lý do: Nghiệp vụ trung tâm thường là học 1 lớp tại một thời điểm; chuyển lớp = kết thúc cũ + tạo mới.

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_one_active_per_student
  ON enrollments (student_id)
  WHERE status IN ('ACTIVE', 'PAUSED');
