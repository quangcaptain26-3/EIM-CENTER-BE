import { swaggerBase } from '../../config/swagger';
import { buildSchemas } from './openapi.schemas';
import { buildPaths } from './openapi.paths';

/**
 * Hàm build OpenAPI Spec hoàn chỉnh bằng cách merge base, schemas và paths
 */
export function buildOpenApiSpec() {
  return {
    ...swaggerBase,
    paths: buildPaths(),
    components: {
      schemas: buildSchemas(),
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
  };
}
