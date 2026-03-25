import { z } from "zod";

export const assignStaffBodySchema = z.object({
  userId: z.string().uuid("User ID không hợp lệ"),
  // class_staff chỉ nhận MAIN/TA. Cover teacher là theo session, không gán ở đây.
  type: z.enum(["MAIN", "TA"]),
});

export type AssignStaffBody = z.infer<typeof assignStaffBodySchema>;

/** Đổi giáo viên chính (MAIN) dài hạn — từ ngày effectiveFrom trở đi. */
export const changeMainTeacherBodySchema = z.object({
  userId: z.string().uuid("User ID không hợp lệ"),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveFrom phải là YYYY-MM-DD")
    .optional(),
});

export type ChangeMainTeacherBody = z.infer<typeof changeMainTeacherBodySchema>;
