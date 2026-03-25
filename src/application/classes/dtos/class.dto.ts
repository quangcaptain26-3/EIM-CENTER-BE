import { z } from "zod";

const createClassScheduleSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
}).refine((data) => data.endTime > data.startTime, {
  message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu",
  path: ["endTime"],
});

export const createClassBodySchema = z.object({
  code: z.string().min(1, "Mã lớp học không được để trống"),
  name: z.string().min(1, "Tên lớp học không được để trống"),
  programId: z.string().uuid("Program ID không hợp lệ"),
  room: z.string().optional(),
  capacity: z.number().int().positive().optional().default(16),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu phải theo định dạng YYYY-MM-DD"),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED"]).optional().default("ACTIVE"),
  schedules: z.array(createClassScheduleSchema).min(1, "Phải có ít nhất 1 lịch học").optional(),
  autoGenerateSessions: z.boolean().optional().default(true),
  generateUntilUnitNo: z.number().int().positive().optional(),
  generateWeeks: z.number().int().positive().optional(),
});

export type CreateClassBody = z.infer<typeof createClassBodySchema>;

export const updateClassBodySchema = z.object({
  name: z.string().min(1, "Tên lớp học không được để trống").optional(),
  room: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu phải theo định dạng YYYY-MM-DD").optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED"]).optional(),
});

export type UpdateClassBody = z.infer<typeof updateClassBodySchema>;

export const listClassesQuerySchema = z.object({
  search: z.string().optional(),
  programId: z.string().uuid("Program ID không hợp lệ").optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED"]).optional(),
  limit: z.coerce.number().int().positive().optional().default(10),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type ListClassesQuery = z.infer<typeof listClassesQuerySchema>;

export const addEnrollmentBodySchema = z.object({
  enrollmentId: z.string().uuid("Enrollment ID phải là UUID").optional(),
  studentId: z.string().uuid("Student ID phải là UUID").optional(),
  programId: z.string().uuid("Program ID phải là UUID").optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu phải là YYYY-MM-DD").optional(),
}).refine(data => data.enrollmentId || (data.studentId && data.startDate), {
  message: "Phải cung cấp enrollmentId hoặc (studentId và startDate)",
});

export type AddEnrollmentBody = z.infer<typeof addEnrollmentBodySchema>;

/** Body cho đóng lớp — option complete enrollments (bám thiết kế kết thúc khóa) */
export const closeClassBodySchema = z.object({
  /** Khi true (mặc định): chuyển tất cả enrollment ACTIVE/PAUSED sang GRADUATED trước khi đóng */
  completeRemainingEnrollments: z.boolean().optional().default(true),
});
export type CloseClassBody = z.infer<typeof closeClassBodySchema>;
