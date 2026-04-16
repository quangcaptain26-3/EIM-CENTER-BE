export interface StudentSearchResult {
  id: string;
  studentCode: string;
  fullName: string;
  dob: Date | null;
  parentName: string | null;
  parentPhone: string | null;
  parentPhone2: string | null;
  schoolName: string | null;
  activeEnrollment?: {
    classId: string;
    classCode: string;
    programId: string;
    programCode: string;
    status: string;
  };
}

export interface UserSearchResult {
  id: string;
  userCode: string;
  fullName: string;
  phone: string | null;
  cccd: string | null;
  roleCode: string;
}

export interface ClassSearchResult {
  id: string;
  classCode: string;
  programCode: string;
  programName: string;
  roomCode: string | null;
  teacherName: string | null;
  status: string;
  enrollmentCount: number;
}

export interface ISearchRepo {
  searchStudentsByCode(code: string, limit: number): Promise<StudentSearchResult[]>;
  searchStudentsByPhone(phone: string, limit: number): Promise<StudentSearchResult[]>;
  searchStudentsByDob(dob: Date, limit: number): Promise<StudentSearchResult[]>;
  searchStudentsFts(query: string, limit: number): Promise<StudentSearchResult[]>;

  searchUsersByCode(code: string, roleCode?: string, limit?: number): Promise<UserSearchResult[]>;
  searchUsersByPhoneOrCccd(phoneOrCccd: string, roleCode?: string, limit?: number): Promise<UserSearchResult[]>;
  searchUsersFts(query: string, roleCode?: string, limit?: number): Promise<UserSearchResult[]>;

  searchClasses(query: string, limit: number): Promise<ClassSearchResult[]>;
}
