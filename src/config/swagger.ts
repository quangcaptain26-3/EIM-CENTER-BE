import { env } from './env';

/**
 * Cấu hình cơ bản cho Swagger OpenAPI Specification
 */
export const swaggerBase = {
  openapi: '3.0.0',
  info: {
    title: 'EIM Center',
    version: '1.0.0',
    description: 'API EIM Center Backend',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local server',
    },
  ],
  tags: [ 
    { name: 'System', description: 'Các API liên quan đến hệ thống (VD: Health Check)' },
    // Module sau 
  ],
};
