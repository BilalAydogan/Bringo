export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;
