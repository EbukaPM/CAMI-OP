import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessFinance, isHqRole, ForbiddenError } from "@/lib/rbac";
import { Badge, Card, CardContent, CardHeader, CardTitle, LinkButton, StatCard } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

function monthBounds(monthParam?: string) {
  const now = new Date();
  const [y, m] = (monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end, label: start.toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }), key: `${y}-${String(m).padStart(2, "0")}` };
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function BranchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { month } = await searchParams;

  const branch = await db.branch.findUnique({ where: { id }, include: { _count: { select: { members: true, users: true } } } });
  if (!branch) notFound();

  const canViewFinance = canAccessFinance(session, id);
  if (!isHqRole(session.role) && !canViewFinance) {
    throw new ForbiddenError("You can only view your own branch's report.");
  }

  const { start, end, label, key } = monthBounds(month);

  const [services, givingRecords, expenseRecords] = await Promise.all([
    db.service.findMany({
      where: { branchId: id, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
      include: { givingRecords: { include: { category: true } } },
    }),
    db.givingRecord.findMany({
      where: { branchId: id, createdAt: { gte: start, lt: end } },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    db.expenseRecord.findMany({
      where: { branchId: id, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalGiving = givingRecords.reduce((sum, g) => sum + Number(g.amount), 0);
  const totalExpenses = expenseRecords.filter((e) => e.status === "APPROVED").reduce((sum, e) => sum + Number(e.amount), 0);
  const totalAttendance = services.reduce((sum, s) => sum + (s.totalAttendance ?? 0), 0);

  const byCategory = new Map<string, number>();
  for (const g of givingRecords) {
    byCategory.set(g.category.name, (byCategory.get(g.category.name) ?? 0) + Number(g.amount));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{branch.name}</h1>
        <p className="text-sm text-slate-500">
          {[branch.city, branch.state].filter(Boolean).join(", ") || "—"} · {branch._count.members} members · {branch.serviceSchedule ?? "No schedule set"}
        </p>
      </div>

      {canViewFinance ? (
        <>
          <div className="flex items-center justify-between">
            <LinkButton href={`/branches/${id}?month=${shiftMonth(key, -1)}`} variant="ghost">
              <ChevronLeft size={14} /> Previous month
            </LinkButton>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
            <LinkButton href={`/branches/${id}?month=${shiftMonth(key, 1)}`} variant="ghost">
              Next month <ChevronRight size={14} />
            </LinkButton>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total giving" value={formatCurrency(totalGiving)} />
            <StatCard label="Approved expenses" value={formatCurrency(totalExpenses)} />
            <StatCard label="Net" value={formatCurrency(totalGiving - totalExpenses)} />
            <StatCard label="Total attendance" value={String(totalAttendance)} sub={`${services.length} service${services.length === 1 ? "" : "s"}`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Giving by category — {label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...byCategory.entries()].map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">{name}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(amount)}</span>
                </div>
              ))}
              {byCategory.size === 0 && <p className="text-sm text-slate-500">No giving recorded for {label}.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services this month</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Attendance</th>
                    <th className="px-5 py-3">Giving recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => {
                    const serviceTotal = s.givingRecords.reduce((sum, g) => sum + Number(g.amount), 0);
                    return (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                        <td className="px-5 py-3 text-slate-900 dark:text-slate-100">{formatDate(s.date)}</td>
                        <td className="px-5 py-3 text-slate-500">{s.type}</td>
                        <td className="px-5 py-3 text-slate-500">{s.totalAttendance ?? "—"}</td>
                        <td className="px-5 py-3 text-slate-500">{formatCurrency(serviceTotal)}</td>
                      </tr>
                    );
                  })}
                  {services.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                        No services recorded for {label}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses this month</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRecords.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                      <td className="px-5 py-3 text-slate-900 dark:text-slate-100">{e.category}</td>
                      <td className="px-5 py-3 text-slate-500">{formatCurrency(e.amount.toString())}</td>
                      <td className="px-5 py-3">
                        <Badge color={e.status === "APPROVED" ? "green" : e.status === "REJECTED" ? "red" : "amber"}>{e.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                  {expenseRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                        No expenses recorded for {label}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="text-sm text-slate-500">
            You don&apos;t have access to this branch&apos;s financial report.
          </CardContent>
        </Card>
      )}

      <Link href="/branches" className="text-sm text-slate-500 hover:underline">
        ← Back to branches
      </Link>
    </div>
  );
}
