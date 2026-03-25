import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';
import { buildOpenApiSpec } from '../swagger/openapi.builder';
import { registerRoutes } from './routes';
import { AppError } from '../../shared/errors/app-error';
import { errorHandler } from './middlewares/error-handler.middleware';

// Tạo express application
const app: Application = express();

// Đưa container DI vào app.locals để Controller truy xuất dễ dàng
import { buildContainer } from '../../bootstrap/container';
app.locals.container = buildContainer();

// Sử dụng các middleware bảo mật và cơ bản
app.use(helmet());
app.use(cors());
app.use(express.json());

// Load specs của OpenAPI
const swaggerSpec = buildOpenApiSpec();

// Cấu hình Swagger UI (giao diện docs) — /api-docs và /docs đều dùng được
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.get('/docs-json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Route Health Check cơ bản
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' }
  });
});

// Đăng ký các router của ứng dụng
registerRoutes(app);

// Bắt các lỗi route không tồn tại (404)
app.use((req: Request, res: Response, next: NextFunction) => {
  next(AppError.notFound(`Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`));
});

// Sử dụng error handler middleware làm middleware cuối cùng
app.use(errorHandler);

export default app;
