export interface RoleEntity {
  id: string; // uuid
  code: string; // 'ROOT', 'DIRECTOR', 'ACADEMIC', 'SALES', 'ACCOUNTANT', 'TEACHER'
  name: string;
}
