import { Class, ClassSchedule, ClassStatus } from "../entities/class.entity";

export interface ClassListParams {
  search?: string; // ILIKE code or name
  programId?: string; // Lọc theo chương trình
  status?: ClassStatus; // Lọc theo trạng thái
  limit?: number;
  offset?: number;
}

export interface ClassCountParams {
  search?: string;
  programId?: string;
  status?: ClassStatus;
}

export type CreateClassInput = Omit<Class, "id" | "createdAt">;
export type UpdateClassInput = Partial<CreateClassInput>;

export type UpsertScheduleInput = Omit<ClassSchedule, "id" | "classId" | "createdAt">;

/**
 * Interface Repository cho quản lý Lớp học và Lịch học
 */
export interface ClassRepoPort {
  /**
   * Lấy danh sách lớp học có phân trang và lọc
   */
  list(params: ClassListParams): Promise<Class[]>;

  /**
   * Đếm tổng số lớp học theo điều kiện lọc
   */
  count(params: ClassCountParams): Promise<number>;

  /**
   * Truy vấn chi tiết một lớp học bằng ID
   */
  findById(id: string): Promise<Class | null>;

  /**
   * Tạo mới lớp học
   */
  create(input: CreateClassInput): Promise<Class>;

  /**
   * Cập nhật thông tin lớp học (Patch)
   */
  update(id: string, patch: UpdateClassInput): Promise<Class>;

  /**
   * Lấy danh sách lịch học của một lớp
   */
  listSchedules(classId: string): Promise<ClassSchedule[]>;

  /**
   * Cập nhật lịch học (Xóa cũ, Thêm mới)
   */
  upsertSchedules(
    classId: string,
    schedules: UpsertScheduleInput[]
  ): Promise<ClassSchedule[]>;
}
