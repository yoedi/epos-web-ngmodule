/** Paginated response body (docs/api-spec.md "Paginasi"). */
export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  last: boolean;
}

/** Application model of one page of results. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export function toPage<TDto, T>(dto: PageResponseDto<TDto>, mapItem: (item: TDto) => T): Page<T> {
  return {
    content: dto.content.map(mapItem),
    page: dto.page,
    size: dto.size,
    totalElements: dto.total_elements,
    totalPages: dto.total_pages,
    last: dto.last,
  };
}
