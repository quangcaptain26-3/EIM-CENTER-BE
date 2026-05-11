import { Request, Response, NextFunction } from 'express';
import { CreateUserUseCase } from '../../../../application/auth/usecases/create-user.usecase';
import { UpdateUserUseCase } from '../../../../application/auth/usecases/update-user.usecase';
import { UpdateSalaryUseCase } from '../../../../application/auth/usecases/update-salary.usecase';
import { ListUsersUseCase } from '../../../../application/auth/usecases/list-users.usecase';
import { GetUserUseCase } from '../../../../application/auth/usecases/get-user.usecase';
import { SoftDeleteUserUseCase } from '../../../../application/auth/usecases/soft-delete-user.usecase';

export function createUserController(
  createUserUsecase: CreateUserUseCase,
  updateUserUsecase: UpdateUserUseCase,
  updateSalaryUsecase: UpdateSalaryUseCase,
  listUsersUsecase: ListUsersUseCase,
  getUserUsecase: GetUserUseCase,
  softDeleteUserUsecase: SoftDeleteUserUseCase,
) {
  return {
    listUsers: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await listUsersUsecase.execute(req.query as any);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },

    createUser: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const result = await createUserUsecase.execute(
          req.body,
          req.user!.id,
          ip,
          userAgent,
        );
        res.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    getUser: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUserId = req.params.id as string;
        const result = await getUserUsecase.execute(targetUserId);

        // Security filtering logic as per requirement:
        // TEACHER chỉ xem bản thân, ACADEMIC xem basic, ADMIN xem full
        const actorRole = req.user!.role;
        const actorId = req.user!.id;

        if (actorRole === 'TEACHER' && actorId !== targetUserId) {
          return res.status(403).json({
            code: 'AUTH_INSUFFICIENT_PERMISSION',
            message: 'Teachers can only view their own profile',
          });
        }

        if (actorRole === 'ACADEMIC') {
          // ACADEMIC xem basic, remove salary info
          delete result.salaryPerSession;
          delete result.allowance;
          delete result.salaryChangeLogs;
        }

        res.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    updateUser: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUserId = req.params.id as string;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const actorId = req.user!.id;
        const actorRole = req.user!.role;

        const result = await updateUserUsecase.execute(
          targetUserId,
          req.body,
          actorId,
          actorRole,
          ip,
          userAgent,
        );
        res.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    softDeleteUser: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUserId = req.params.id as string;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const actorId = req.user!.id;

        await softDeleteUserUsecase.execute(targetUserId, actorId, ip, userAgent);
        res.status(200).json({ data: { success: true } });
      } catch (error) {
        next(error);
      }
    },

    updateSalary: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUserId = req.params.id as string;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const actorId = req.user!.id;

        const result = await updateSalaryUsecase.execute(
          targetUserId,
          req.body,
          actorId,
          ip,
          userAgent,
        );
        res.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    getSalaryLogs: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUserId = req.params.id as string;
        // Re-using getUser properties or directly fetching
        const user = await getUserUsecase.execute(targetUserId);
        res.status(200).json({ data: user.salaryChangeLogs || [] });
      } catch (error) {
        next(error);
      }
    },
  };
}
