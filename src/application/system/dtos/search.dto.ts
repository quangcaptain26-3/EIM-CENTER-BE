import { z } from 'zod';

export const SearchDtoSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type SearchDto = z.infer<typeof SearchDtoSchema>;

export const SearchUsersDtoSchema = SearchDtoSchema.extend({
  roleCode: z.string().optional(),
});

export type SearchUsersDto = z.infer<typeof SearchUsersDtoSchema>;
