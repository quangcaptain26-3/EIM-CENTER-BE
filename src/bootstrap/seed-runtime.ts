/**
 * Chạy script này để seed dữ liệu User mẫu. Mật khẩu đều là 'Eim@2024' (khớp 01_seed_auth.sql)
 * Cách chạy từ thư mục gốc của dự án:
 * npx ts-node src/bootstrap/seed-runtime.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load biến môi trường ngay lập tức ở đầu file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { pool } from '../infrastructure/db/pg-pool';
import { PasswordHasher } from '../infrastructure/auth/password-hasher';

const users = [
  { email: 'root@eim.edu.vn', fullName: 'Root Admin', roleCode: 'ROOT' },
  { email: 'director@eim.edu.vn', fullName: 'Giám Đốc', roleCode: 'DIRECTOR' },
  { email: 'teacher@eim.edu.vn', fullName: 'Giáo Viên Ngữ Pháp', roleCode: 'TEACHER' },
  { email: 'accountant@eim.edu.vn', fullName: 'Kế Toán Trưởng', roleCode: 'ACCOUNTANT' },
  { email: 'sales@eim.edu.vn', fullName: 'Nhân Viên Kinh Doanh', roleCode: 'SALES' },
];

async function seed() {
  console.log('Bắt đầu Seed users...');
  
  try {
    const passwordHash = await PasswordHasher.hash('Eim@2024');

    for (const user of users) {
      // 1. Lấy vai trò RoleID
      const roleResult = await pool.query('SELECT id FROM auth_roles WHERE code = $1', [user.roleCode]);
      if (roleResult.rows.length === 0) {
        console.warn(`[WARN] Không tìm thấy role ${user.roleCode}, bỏ qua user ${user.email}`);
        continue;
      }
      const roleId = roleResult.rows[0].id;

      // 2. Insert User (Chống trùng lặp bằng Upsert ON CONFLICT UPDATE)
      const userRes = await pool.query(`
        INSERT INTO auth_users (email, password_hash, full_name, status)
        VALUES ($1, $2, $3, 'ACTIVE')
        ON CONFLICT (email) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name
        RETURNING id;
      `, [user.email, passwordHash, user.fullName]);

      const userId = userRes.rows[0].id;

      // 3. Insert User_Roles mapping
      await pool.query(`
        INSERT INTO auth_user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      `, [userId, roleId]);

      console.log(`Đã tạo thành công user: ${user.email} (Role: ${user.roleCode})`);
    }

    console.log('Seed users hoàn tất!');
  } catch (error) {
    console.error('Lỗi khi seed users:', error);
  } finally {
    await pool.end();
  }
}

seed();
