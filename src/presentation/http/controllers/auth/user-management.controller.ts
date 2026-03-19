import { Request, Response, NextFunction } from 'express';
import { ListUsersQueryDto } from '../../../../application/auth/dtos/user-management.dto';
import { ListUsersUseCase } from '../../../../application/auth/usecases/list-users.usecase';
import { GetUserUseCase } from '../../../../application/auth/usecases/get-user.usecase';
import { CreateUserUseCase } from '../../../../application/auth/usecases/create-user.usecase';
import { UpdateUserUseCase } from '../../../../application/auth/usecases/update-user.usecase';
import { AssignRoleUseCase } from '../../../../application/auth/usecases/assign-role.usecase';
import { RevokeRoleUseCase } from '../../../../application/auth/usecases/revoke-role.usecase';

export class UserManagementController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly revokeRoleUseCase: RevokeRoleUseCase
  ) {}

  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.listUsersUseCase.execute(req.query as unknown as ListUsersQueryDto);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.getUserUseCase.execute(req.params.id as string);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.createUserUseCase.execute(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.updateUserUseCase.execute(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  assignRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.assignRoleUseCase.execute(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  revokeRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, roleCode } = req.params;
      const result = await this.revokeRoleUseCase.execute(id as string, roleCode as string);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
