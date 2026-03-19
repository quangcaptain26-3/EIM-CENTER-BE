import { z } from "zod";

export const promoteClassBodySchema = z.object({
  toClassId: z.string().uuid("toClassId phải là UUID"),
  note: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  closeSourceClass: z.boolean().optional().default(true),
});

export type PromoteClassBody = z.infer<typeof promoteClassBodySchema>;
