import { FeePlan } from "../entities/fee-plan.entity";

/**
 * Port Repository quản lý Gói học phí (Fee Plan)
 * Chỉ chứa các tác vụ truy xuất Data (Data Access Layer).
 */
export interface FeePlanRepoPort {
  /** 
   * Lấy danh sách gói học phí.
   * Nếu có programId thì chỉ lọc theo chương trình học đó.
   */
  list(programId?: string): Promise<FeePlan[]>;

  /** Tạo một gói học phí mới */
  create(input: Omit<FeePlan, "id" | "createdAt">): Promise<FeePlan>;

  /** Cập nhật thông tin gói học phí theo ID */
  update(id: string, patch: Partial<Omit<FeePlan, "id" | "createdAt">>): Promise<FeePlan>;

  /** Tìm Gói học phí theo ID */
  findById(id: string): Promise<FeePlan | null>;

  /** Xóa gói học phí theo ID (có thể bị chặn bởi FK nếu đang được dùng) */
  delete(id: string): Promise<boolean>;
}
