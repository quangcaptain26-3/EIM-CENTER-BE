import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from '../../../shared/errors/app-error';

/**
 * Middleware để validate request (body, query, params)
 * Dựa trên Zod Schema. Nếu vi phạm, ném lỗi AppError dạng badRequest.
 */
export const validate = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Gọi zod để validate data từ request
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Gom chi tiết lỗi Zod
        const details = error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return next(AppError.badRequest('Dữ liệu không hợp lệ', details));
      }
      return next(error);
    }
  };
};
