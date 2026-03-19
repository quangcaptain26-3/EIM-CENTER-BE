export interface UserEntity {
  id: string; // uuid
  email: string;
  password_hash: string;
  full_name: string;
  status: string; // 'ACTIVE', 'INACTIVE'
  created_at: Date;
}
