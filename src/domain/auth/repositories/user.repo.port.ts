import { UserEntity } from '../entities/user.entity';

export interface UserAuthInfo {
  user: UserEntity;
  roles: string[];      // Danh sách các role code
  permissions: string[]; // Danh sách các permission code
}

export interface CreateUserData {
  id?: string;
  email: string;
  password_hash: string;
  full_name: string;
  status: string;
}

export interface UpdateUserData {
  full_name?: string;
  status?: string;
}

export interface UserListParams {
  search?: string;
  roleCode?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UserRepoPort {
  /**
   * Tìm User theo email
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Tìm User theo id
   */
  findById(id: string): Promise<UserEntity | null>;

  /**
   * Lấy chi tiết User kèm theo các Roles và Permissions của User đó
   */
  getUserAuthInfo(userId: string): Promise<UserAuthInfo | null>;

  /**
   * Lấy danh sách Users có phân trang
   */
  findAll(params: UserListParams): Promise<{ items: UserAuthInfo[], total: number }>;

  /**
   * Tạo User mới
   */
  create(data: CreateUserData): Promise<UserEntity>;

  /**
   * Cập nhật thông tin User
   */
  update(id: string, data: UpdateUserData): Promise<UserEntity>;

  /**
   * Gán role cho User
   */
  assignRole(userId: string, roleCode: string): Promise<void>;

  /**
   * Thu hồi role của User
   */
  revokeRole(userId: string, roleCode: string): Promise<void>;

  /**
   * Lưu refresh token vào DB
   */
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;

  /**
   * Thu hồi một refresh token (Đánh dấu đã bị thu hồi)
   */
  revokeRefreshToken(tokenHash: string): Promise<void>;

  /**
   * Tìm và kiểm tra refresh token còn hiệu lực không
   */
  findValidRefreshToken(tokenHash: string): Promise<{ userId: string; expiresAt: Date; revokedAt: Date | null } | null>;
}
