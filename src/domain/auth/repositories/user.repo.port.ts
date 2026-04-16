import { UserEntity } from '../entities/user.entity';

export interface IUserRepo {
  findById(id: string): Promise<UserEntity | null>;

  findByEmail(email: string): Promise<UserEntity | null>;

  findByCode(code: string): Promise<UserEntity | null>;

  findAll(params: {
    roleCode?: string;
    isActive?: boolean;
    /** ILIKE search on full_name, phone, cccd */
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ data: UserEntity[]; total: number }>;

  create(
    data: Omit<
      UserEntity,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'isDeleted'
      | 'canDo'
      | 'getSeniorityMonths'
    >,
  ): Promise<UserEntity>;

  update(
    id: string,
    data: Partial<
      Pick<
        UserEntity,
        | 'fullName'
        | 'gender'
        | 'dob'
        | 'phone'
        | 'address'
        | 'cccd'
        | 'nationality'
        | 'ethnicity'
        | 'religion'
        | 'educationLevel'
        | 'major'
        | 'startDate'
        | 'salaryPerSession'
        | 'allowance'
        | 'isActive'
      >
    >,
  ): Promise<UserEntity>;

  softDelete(id: string): Promise<void>;
}
