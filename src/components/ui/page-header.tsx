import type { ReactNode } from "react";

/**
 * Sticks to the top of the scrollable <main> in the dashboard layout so a
 * page's title/description/actions stay visible while its content scrolls
 * underneath. Negative margins pull it flush with <main>'s own padding so
 * the sticky backdrop spans edge-to-edge instead of leaving a gap.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-6 border-b border-slate-200 bg-slate-50/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
