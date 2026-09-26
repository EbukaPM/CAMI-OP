import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { visibleNavItems } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/utils";
import { logoutAction } from "./logout-action";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const items = visibleNavItems(session.role);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="mb-8 px-2">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">CAMI OP</p>
          <p className="text-xs text-slate-500">Operations Portal</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="md:hidden text-sm font-semibold text-slate-900 dark:text-slate-100">CAMI OP</div>
          <div className="ml-auto flex items-center gap-4">
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
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
