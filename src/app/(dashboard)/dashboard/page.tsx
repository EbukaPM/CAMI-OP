import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, canViewEquipmentValuation } from "@/lib/rbac";
import { getEquipmentValuation } from "@/lib/data/equipment";
import { Card, CardContent, CardHeader, CardTitle, StatCard, Badge } from "@/components/ui/primitives";
import { formatCurrency, formatDate, ROLE_LABELS } from "@/lib/utils";

export default async function DashboardHome() {
  const session = await requireSession();
  const hq = isHqRole(session.role);
  const branchFilter = hq ? {} : { branchId: session.branchId ?? "__none__" };

  const [branchCount, memberCount, pendingRequests, recentAnnouncements] = await Promise.all([
    hq ? db.branch.count() : Promise.resolve(session.branchId ? 1 : 0),
    db.member.count({ where: branchFilter }),
    db.request.count({ where: { ...branchFilter, status: { in: ["SUBMITTED", "VERIFICATION", "HQ_REVIEW"] } } }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const valuation = canViewEquipmentValuation(session) ? await getEquipmentValuation(session) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome back, {session.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500">{ROLE_LABELS[session.role] ?? session.role}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={hq ? "Branches" : "Your Branch"} value={String(branchCount)} />
        <StatCard label="Members" value={String(memberCount)} />
        <StatCard label="Pending Requests" value={String(pendingRequests)} />
        {valuation ? (
          <StatCard
            label={valuation.scope === "CHURCH_WIDE" ? "Church-wide Equipment Worth" : `Equipment Worth (${valuation.branchName})`}
            value={formatCurrency(valuation.totalWorth)}
            sub={`${valuation.totalCount} asset${valuation.totalCount === 1 ? "" : "s"} — restricted view`}
          />
        ) : (
          <StatCard label="Equipment Worth" value="Restricted" sub="Visible to Branch Pastors and the General Overseer only" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAnnouncements.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
          {recentAnnouncements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{a.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge color="blue">{a.scope}</Badge>
                <span className="text-xs text-slate-400">{formatDate(a.createdAt)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
