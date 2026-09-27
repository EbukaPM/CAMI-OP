export const DEFAULT_PAGE_SIZE = 15;

export function parsePage(pageParam: string | undefined) {
  const page = parseInt(pageParam ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function pageSkipTake(pageParam: string | undefined, pageSize = DEFAULT_PAGE_SIZE) {
  const page = parsePage(pageParam);
  return { page, skip: (page - 1) * pageSize, take: pageSize };
}
