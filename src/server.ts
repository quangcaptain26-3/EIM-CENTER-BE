import http from 'http';
import app from './presentation/http/app';
import { env } from './config/env';

/**
 * Hàm tạo và khởi chạy HTTP Server
 */
export function startServer() {
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.log(`[Server] Khởi động thành công!`);
    console.log(`[Server] Lắng nghe tại cổng giao tiếp: ${env.PORT}`);
    console.log(`[Server] Chế độ môi trường (Environment): ${env.NODE_ENV}`);
    console.log(`[Swagger] UI: http://localhost:${env.PORT}/docs`);
    console.log(`[Swagger] JSON: http://localhost:${env.PORT}/docs-json`);
    console.log(`[Health] Check: http://localhost:${env.PORT}/health`);
  });

  // Có thể bắt các sự kiện process ở đây (SIGINT, SIGTERM) để grace shutdown
}
