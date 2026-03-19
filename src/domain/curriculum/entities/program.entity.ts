/**
 * Interface biểu diễn thực thể Program (Chương trình học)
 */
export interface Program {
  id: string; // uuid
  code: string;
  name: string; // tên chương trình (vd: Chương trình Starters)
  level: string; // KINDY | STARTERS | MOVERS | FLYERS
  totalUnits: number; // Tổng số Unit
  lessonsPerUnit: number; // Mặc định là 7
  sessionsPerWeek: number; // Mặc định là 2
  feePlanId?: string | null; // Tham chiếu đến bảng học phí nếu có
  createdAt: Date;
}
