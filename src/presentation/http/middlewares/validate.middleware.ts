import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export function validate(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed.',
          details: error.flatten(),
        });
      }
      next(error);
    }
  };
}
