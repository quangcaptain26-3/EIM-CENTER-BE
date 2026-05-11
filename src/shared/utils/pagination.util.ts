const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

export interface PaginationResult {
  page:   number;
  limit:  number;
  offset: number;
}

/**
 * Chuẩn hóa tham số phân trang từ query string.
 *
 * - page  : mặc định 1, tối thiểu 1
 * - limit : mặc định 20, tối thiểu 1, tối đa 100
 *
 * @example
 *   buildPaginationParams({ page: '2', limit: '10' })
 *   // → { page: 2, limit: 10, offset: 10 }
 */
export function buildPaginationParams(query: {
  page?:  string | number;
  limit?: string | number;
}): PaginationResult {
  let page  = typeof query.page  === 'number' ? query.page  : parseInt(query.page  ?? '', 10);
  let limit = typeof query.limit === 'number' ? query.limit : parseInt(query.limit ?? '', 10);

  if (!Number.isFinite(page)  || page  < 1) page  = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
