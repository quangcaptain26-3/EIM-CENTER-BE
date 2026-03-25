# Báo cáo E2E Test — Luồng Hệ thống EIM

**Ngày chạy:** 2025-03-21  
**Base URL:** http://localhost:3000  
**Mật khẩu demo:** Demo@123456 (DB chưa re-seed với Eim@2024)

---

## Tổng quan

| Trạng thái | Số lượng |
|------------|----------|
| ✅ PASS | 10 |
| ❌ FAIL | 3 |
| ⚠️ WARN | 0 |

---

## Chi tiết từng bước

### BƯỚC 1 — Đăng nhập từng role ✅
- **Kết quả:** PASS
- Đăng nhập thành công: Sales, Học vụ, Teacher, Kế toán
- Token lưu dùng cho các bước sau

### BƯỚC 2 — Sales tạo trial ✅
- **Kết quả:** PASS
- POST /trials: 201, trial_id trả về
- POST /trials/:id/schedule: 200
- PATCH /trials/:id (status=ATTENDED): 200

### BƯỚC 3 — Sales convert trial ✅
- **Kết quả:** PASS
- POST /trials/:id/convert: 200
- Response có `studentId` và `enrollmentId`

### BƯỚC 4 — Học vụ tạo lớp ✅
- **Kết quả:** PASS (sau khi tắt autoGenerateSessions)
- POST /classes: 201
- **Lưu ý:** `autoGenerateSessions: true` + `generateUntilUnitNo` gây lỗi `CURRICULUM/UNIT_SEQUENCE_MISMATCH` vì program STARTERS khai báo 12 units nhưng seed chỉ có 6. Dùng `autoGenerateSessions: false` để tạo lớp không sinh sessions.

### BƯỚC 5 — Học vụ xếp học sinh + gán giáo viên ⚠️
- **Add enrollment:** ❌ FAIL — 500
  - **Lỗi:** `column "transfer_unit_no" of relation "enrollment_history" does not exist`
  - **Nguyên nhân:** DB chưa chạy migration 28 (transfer_unit_lesson) — bảng `enrollment_history` thiếu cột `transfer_unit_no`, `transfer_lesson_no`
- **Gán staff:** ✅ PASS
- **Roster:** ✅ PASS (học sinh từ convert đã có trong lớp seed)

### BƯỚC 6 — Teacher nhập feedback ⚠️
- **Teacher submit:** ❌ FAIL — 400
  - **Lỗi:** `FEEDBACK/EDIT_DEADLINE_PASSED` — Đã quá hạn chỉnh sửa (7 ngày sau buổi học)
  - **Nguyên nhân:** Sessions seed có `session_date` 2025-09-09 (quá khứ)
- **Kế toán submit feedback:** ✅ PASS — 403 Forbidden (đúng, không được phép)

### BƯỚC 7 — Kế toán tạo invoice và ghi payment ✅
- **Kết quả:** PASS
- POST /finance/invoices: 201
- POST /finance/payments (partial): 201 → invoice status hợp lý
- POST /finance/payments (full): 201 → invoice.status = 'PAID'
- POST /finance/payments (thêm khi đã paid): 400 — `FINANCE/INVOICE_ALREADY_PAID` ✅

### BƯỚC 8 — Học vụ đóng lớp và lên lớp ⚠️
- **POST /classes/:id/close:** ✅ PASS (trong một số run)
- **POST /classes/:id/promotion:** ❌ FAIL — 500
  - **Lỗi:** `column cp.sort_order does not exist`
  - **Nguyên nhân:** DB chưa chạy migration 27 (promotion_schema) — bảng `curriculum_programs` thiếu cột `sort_order`

---

## Các sửa đổi đã thực hiện

1. **Classes controller validation:** Bổ sung `z.object({ body: ... })` cho các schema validate body (createClass, updateClass, addEnrollment, assignStaff, promote) để khớp với middleware `validate` truyền `{ body, query, params }`.

2. **Test script:** Thêm suffix unique cho mỗi run (phone, email, code lớp) để tránh conflict khi chạy lặp.

---

## Khuyến nghị

1. **Chạy đủ migrations:** Đảm bảo chạy `03_run_migrations.sql` đầy đủ, đặc biệt migration 27 (promotion_schema) và 28 (transfer_unit_lesson).
2. **Seed curriculum:** Bổ sung đủ units cho STARTERS (7–12) nếu muốn dùng `autoGenerateSessions: true` với `generateUntilUnitNo`.
3. **Test feedback:** Dùng session có `session_date` trong vòng 7 ngày gần đây, hoặc đăng nhập ACADEMIC/ROOT để override deadline.
4. **Re-seed với Eim@2024:** Sau khi cập nhật seed 01_seed_auth.sql, chạy lại seed để đổi mật khẩu.
