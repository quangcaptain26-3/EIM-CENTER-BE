import { RoleEntity } from '../entities/role.entity';

export interface IRoleRepo {
  findById(id: string): Promise<RoleEntity | null>;

  findByCode(code: string): Promise<RoleEntity | null>;

  listAll(): Promise<RoleEntity[]>;
}
