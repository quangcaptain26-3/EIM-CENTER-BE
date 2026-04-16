-- =============================================================================
-- SEED 03: rooms & holidays
-- =============================================================================

INSERT INTO rooms (id, room_code, capacity) VALUES
('30000000-0000-0000-0000-000000000001', 'P.101', 15),
('30000000-0000-0000-0000-000000000002', 'P.102', 15),
('30000000-0000-0000-0000-000000000003', 'P.103', 15),
('30000000-0000-0000-0000-000000000004', 'P.104', 12),
('30000000-0000-0000-0000-000000000005', 'P.105', 12),
('30000000-0000-0000-0000-000000000006', 'P.201', 20);

-- Ngày lễ: cột holiday_date luôn ghi năm mẫu 2000 — không mang nghĩa năm; BE chỉ dùng tháng+ngày (is_recurring = true).
-- Khối Tết / Giỗ dưới là ngày dương minh họa (thực tế lịch âm lệch năm → có thể chỉnh qua import/UI).
INSERT INTO holidays (holiday_date, name, is_recurring) VALUES
('2000-01-01', 'Tết Dương lịch', true),
('2000-02-15', 'Tết Nguyên Đán 28 Chạp', true),
('2000-02-16', 'Tết Nguyên Đán 29 Chạp', true),
('2000-02-17', 'Tết Nguyên Đán Mùng 1', true),
('2000-02-18', 'Tết Nguyên Đán Mùng 2', true),
('2000-02-19', 'Tết Nguyên Đán Mùng 3', true),
('2000-04-25', 'Giỗ Tổ Hùng Vương', true),
('2000-04-30', 'Ngày Giải phóng miền Nam', true),
('2000-05-01', 'Ngày Quốc tế Lao động', true),
('2000-09-02', 'Quốc khánh', true);
