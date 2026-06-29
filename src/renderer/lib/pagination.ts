export const DEFAULT_PAGE_SIZE = 20;

export type PaginationState = {
  currentPage: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
  startIndex: number;
  totalItems: number;
  totalPages: number;
};

export const createPaginationState = ({
  currentPage,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems
}: {
  currentPage: number;
  pageSize?: number;
  totalItems: number;
}): PaginationState => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageNumber = clampPageNumber(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPageNumber - 1) * pageSize + 1;
  const endIndex = Math.min(currentPageNumber * pageSize, totalItems);

  return {
    currentPage: currentPageNumber,
    endIndex,
    hasNextPage: currentPageNumber < totalPages,
    hasPreviousPage: currentPageNumber > 1,
    pageSize,
    startIndex,
    totalItems,
    totalPages
  };
};

export const getPagedItems = <T>(items: T[], pagination: PaginationState): T[] => {
  const pageStartIndex = (pagination.currentPage - 1) * pagination.pageSize;

  return items.slice(pageStartIndex, pageStartIndex + pagination.pageSize);
};

export const clampPageNumber = (pageNumber: number, totalPages: number): number => {
  return Math.min(Math.max(1, pageNumber), totalPages);
};
