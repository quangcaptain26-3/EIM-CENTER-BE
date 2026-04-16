-- =============================================================================
-- SEED 01: roles
-- =============================================================================

INSERT INTO roles (id, code, name, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Giám đốc', '["*"]'),
('00000000-0000-0000-0000-000000000002', 'ACADEMIC', 'Nhân viên Học vụ',
 '["class:read","class:create","class:update","class:assign_cover","class:reschedule","enrollment:read","enrollment:create","enrollment:transfer_class","attendance:record","makeup:create","student:read","student:create","student:update","pause_request:create","search:all","debt:read"]'),
('00000000-0000-0000-0000-000000000003', 'ACCOUNTANT', 'Nhân viên Kế toán',
 '["receipt:create","receipt:void","payroll:finalize","payroll:read","finance:dashboard","debt:read","enrollment:read","student:read"]'),
('00000000-0000-0000-0000-000000000004', 'TEACHER', 'Giáo viên',
 '["session:read_own","attendance:record","makeup:read_own","payroll:read_own","profile:read_own"]');
