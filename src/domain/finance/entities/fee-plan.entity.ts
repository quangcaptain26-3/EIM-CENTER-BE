/**
 * Entity: Gói học phí (Fee Plan)
 * Liên kết program (chương trình học) với mức học phí quy định.
 */
export type FeePlan = {
  id: string;               // UUID
  programId: string;        // ID chương trình (curriculum_programs)
  name: string;             // Tên gói học phí
  amount: number;           // Số tiền
  currency: string;         // Loại tiền tệ
  sessionsPerWeek: number;  // Số buổi trên tuần
  createdAt: Date;          // Thời gian tạo
};
