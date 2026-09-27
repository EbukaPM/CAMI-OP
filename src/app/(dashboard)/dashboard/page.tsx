import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, canViewEquipmentValuation } from "@/lib/rbac";
import { getEquipmentValuation } from "@/lib/data/equipment";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard, Badge } from "@/components/ui/primitives";
import { formatCurrency, formatDate, ROLE_LABELS } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardHome() {
  const session = await requireSession();
  const hq = isHqRole(session.role) && !session.isViewOnly;
  const branchFilter = hq ? {} : { branchId: session.branchId ?? "__none__" };

  const [branchCount, memberCount, pendingRequests, recentAnnouncements, givingAgg, expenseAgg] = await Promise.all([
    hq ? db.branch.count() : Promise.resolve(session.branchId ? 1 : 0),
    db.member.count({ where: branchFilter }),
    db.request.count({ where: { ...branchFilter, status: { in: ["SUBMITTED", "VERIFICATION", "HQ_REVIEW"] } } }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.givingRecord.aggregate({ where: branchFilter, _sum: { amount: true } }),
    db.expenseRecord.aggregate({ where: { ...branchFilter, status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const valuation = canViewEquipmentValuation(session) ? await getEquipmentValuation(session) : null;
  const totalGiving = Number(givingAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${session.fullName.split(" ")[0]}`} description={ROLE_LABELS[session.role] ?? session.role} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={hq ? "Branches" : "Your Branch"} value={String(branchCount)} href={hq ? "/branches" : undefined} />
        <StatCard label="Members" value={String(memberCount)} href="/members" />
        <StatCard label="Pending Requests" value={String(pendingRequests)} href="/requests" />
        {valuation ? (
          <StatCard
            label={valuation.scope === "CHURCH_WIDE" ? "Church-wide Equipment Worth" : `Equipment Worth (${valuation.branchName})`}
            value={formatCurrency(valuation.totalWorth)}
            sub={`${valuation.totalCount} asset${valuation.totalCount === 1 ? "" : "s"} — restricted view`}
            href="/equipment"
          />
        ) : (
          <StatCard label="Equipment Worth" value="Restricted" sub="Visible to Branch Pastors and the General Overseer only" />
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          {hq ? "Church-wide finance" : "Your branch's finance"} — click through for the full breakdown
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Giving" value={formatCurrency(totalGiving)} sub="Tithes, offerings, seeds & more" href="/finance" />
          <StatCard label="Approved Expenses" value={formatCurrency(totalExpense)} href="/finance" />
          <StatCard label="Net" value={formatCurrency(totalGiving - totalExpense)} href="/finance" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAnnouncements.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
          {recentAnnouncements.map((a) => (
            <Link
              key={a.id}
              href="/communications"
              className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{a.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge color="blue">{a.scope}</Badge>
                <span className="text-xs text-slate-400">{formatDate(a.createdAt)}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
