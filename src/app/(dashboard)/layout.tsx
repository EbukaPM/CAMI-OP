import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NAV_ITEMS } from "@/lib/nav";
import { getVisibleModules } from "@/lib/permissions";
import { getChurchSettings } from "@/lib/settings";
import { ROLE_LABELS } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "./logout-action";
import { exitBranchViewAction } from "./branch-view-actions";
import { Eye, LogOut } from "lucide-react";

// The fixed module set shown while HQ is browsing a branch's portal — org-
// level modules (Branches, Users & Roles, Audit Log, Settings) stay off the
// menu since this view is scoped to one branch, not the whole church.
const BRANCH_PORTAL_MODULES = new Set([
  "dashboard",
  "members",
  "pastoral",
  "finance",
  "requests",
  "documents",
  "equipment",
  "tasks",
  "communications",
]);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [visibleModules, settings, viewedBranch] = await Promise.all([
    session.isViewOnly ? Promise.resolve(BRANCH_PORTAL_MODULES) : getVisibleModules(session),
    getChurchSettings(),
    session.isViewOnly && session.branchId ? db.branch.findUnique({ where: { id: session.branchId }, select: { name: true } }) : Promise.resolve(null),
  ]);
  const items = NAV_ITEMS.filter((item) => visibleModules.has(item.href.slice(1) || "dashboard"));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950" style={{ ["--brand" as string]: settings.primaryColor }}>
      <aside className="hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="mb-8 flex items-center gap-2 px-2">
          {settings.logoFileAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element -- small, DB-served logo; not worth Next/Image's remote-loader config
            <img src={`/api/files/${settings.logoFileAssetId}`} alt={settings.churchName} className="h-8 w-8 rounded object-cover" />
          ) : null}
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{settings.churchName}</p>
            <p className="text-xs text-slate-500">Operations Portal</p>
          </div>
        </div>

        {session.isViewOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
            <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
              <Eye size={13} /> Viewing {viewedBranch?.name ?? "branch"}
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-400">Read-only — actions are disabled here.</p>
            <form action={exitBranchViewAction} className="mt-2">
              <button className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900">
                <LogOut size={12} /> Back to Headquarters
              </button>
            </form>
          </div>
        )}

        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 md:hidden">{settings.churchName}</div>
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{session.fullName}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[session.role] ?? session.role}</p>
            </div>
            <form action={logoutAction}>
              <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
