import { Pool } from 'pg';

// Lấy tham số cấu hình kết nối DB từ biến môi trường
const connectionString = process.env.DATABASE_URL;

/**
 * Khởi tạo Pool connection đến PostgreSQL
 * Sử dụng cho mô hình Connection Pool để reuse các kết nối
 */
export const pool = new Pool({
  connectionString,
  // Cấu hình tuỳ chọn bổ sung (max connections, idle timeout...)
});

// Xử lý shutdown an toàn khi đóng ứng dụng
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: Đóng pg connection pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: Đóng pg connection pool...');
  await pool.end();
  process.exit(0);
});
