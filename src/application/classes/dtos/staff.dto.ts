import { z } from "zod";

export const assignStaffBodySchema = z.object({
  userId: z.string().uuid("User ID không hợp lệ"),
  // class_staff chỉ nhận MAIN/TA. Cover teacher là theo session, không gán ở đây.
  type: z.enum(["MAIN", "TA"]),
});

export type AssignStaffBody = z.infer<typeof assignStaffBodySchema>;
