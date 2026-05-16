import { z } from 'zod';

export const UpdateProgramDefaultFeeDto = z.object({
  defaultFee: z.coerce.number().int().nonnegative(),
});

export type UpdateProgramDefaultFeeInput = z.infer<typeof UpdateProgramDefaultFeeDto>;
