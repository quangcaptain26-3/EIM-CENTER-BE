import { UserEntity } from '../../../domain/auth/entities/user.entity';

export const AuthMapper = {
  /**
   * Ánh xạ thông tin UserEntity sang dạng Profile Response an toàn (không lộ password_hash)
   */
  toProfile(user: UserEntity, roles: string[], permissions: string[]) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      status: user.status,
      roles,
      permissions
    };
  },

  /**
   * Ánh xạ thông tin UserEntity sang response định dạng quản lý User
   */
  toSystemUser(user: UserEntity, roles: string[]) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      status: user.status,
      roles,
      createdAt: user.created_at
    };
  }
};
