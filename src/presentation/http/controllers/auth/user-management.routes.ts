import { Router } from 'express';
import { UserManagementController } from './user-management.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { z } from 'zod';
import { buildContainer } from '../../../../bootstrap/container';
import {
  ListUsersQuerySchema,
  CreateUserSchema,
  UpdateUserSchema,
  AssignRoleSchema
} from '../../../../application/auth/dtos/user-management.dto';

const router = Router();
const container = buildContainer();

const controller = new UserManagementController(
  container.auth.listUsersUseCase,
  container.auth.getUserUseCase,
  container.auth.createUserUseCase,
  container.auth.updateUserUseCase,
  container.auth.assignRoleUseCase,
  container.auth.revokeRoleUseCase
);

/**
 * Endpoints for /system/users
 * Chỉ cấp 'ROOT' được phép quản lý admin users
 */

router.get(
  '/',
  authMiddleware,
  requireRoles(['ROOT']),
  validate(z.object({ query: ListUsersQuerySchema })),
  controller.listUsers
);

router.get(
  '/:id',
  authMiddleware,
  requireRoles(['ROOT']),
  controller.getUser
);

router.post(
  '/',
  authMiddleware,
  requireRoles(['ROOT']),
  validate(z.object({ body: CreateUserSchema })),
  controller.createUser
);

router.patch(
  '/:id',
  authMiddleware,
  requireRoles(['ROOT']),
  validate(z.object({ body: UpdateUserSchema })),
  controller.updateUser
);

router.post(
  '/:id/roles',
  authMiddleware,
  requireRoles(['ROOT']),
  validate(z.object({ body: AssignRoleSchema })),
  controller.assignRole
);

router.delete(
  '/:id/roles/:roleCode',
  authMiddleware,
  requireRoles(['ROOT']),
  controller.revokeRole
);

export const userManagementRouter = router;
