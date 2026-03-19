// Nạp biến môi trường đầu tiên để đảm bảo các file khác import vào đã có process.env
import './config/env'; 
import { startServer } from './server';

// Entry point khởi chạy ứng dụng
async function bootstrap() {
  try {
    // Chạy các tác vụ khởi đầu trước (kết nối DB, redis...) cần await nếu có sau này
    // ...

    // Bắt đầu chạy HTTP server
    startServer();
  } catch (error) {
    console.error('[Bootstrap] Lỗi khi khởi chạy ứng dụng:', error);
    process.exit(1);
  }
}

bootstrap();
