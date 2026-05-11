/** Alias cho UUID v4 string */
export type UUID = string;

/** Biểu diễn giá trị có thể null */
export type Nullable<T> = T | null;

/** Kết quả phân trang */
export interface PagedResult<T> {
  data:        T[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
}

/** Tham số query phân trang từ client */
export interface PaginationParams {
  page?:  number;
  limit?: number;
}
