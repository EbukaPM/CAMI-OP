import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Server-rendered pager: builds plain links that preserve whatever other
 * search params the page already has (sort, filter, branch, ...) and only
 * change `page`. No client JS needed since this is just navigation.
 */
export function Pagination({
  page,
  pageSize,
  totalCount,
  basePath,
  searchParams,
  pageParam = "page",
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
  /** Query param name to update — use a distinct name (e.g. "givingPage") when a page has more than one independently paginated list. */
  pageParam?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) params.set(k, v);
    }
    params.set(pageParam, String(p));
    return `${basePath}?${params.toString()}`;
  }

  const windowSize = 2;
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = page - windowSize; p <= page + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sortedPages = [...pages].sort((a, b) => a - b);

  if (totalCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
      <span>
        Showing {from}–{to} of {totalCount}
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800",
            page <= 1 && "pointer-events-none opacity-40"
          )}
        >
          Previous
        </Link>
        {sortedPages.map((p, i) => (
          <span key={p} className="flex items-center gap-1">
            {i > 0 && sortedPages[i - 1] !== p - 1 && <span className="px-1">…</span>}
            <Link
              href={hrefFor(p)}
              className={cn(
                "rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800",
                p === page && "bg-[var(--brand,#0f172a)] text-white hover:bg-[var(--brand,#0f172a)]"
              )}
            >
              {p}
            </Link>
          </span>
        ))}
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800",
            page >= totalPages && "pointer-events-none opacity-40"
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
