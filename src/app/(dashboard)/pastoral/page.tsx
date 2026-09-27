import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { ScheduleAssignmentModal } from "./schedule-assignment-modal";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import { Role } from "@prisma/client";

export default async function PastoralPage() {
  const session = await requireSession();
  const hq = isHqRole(session.role);

  const [pastors, branches, assignments] = await Promise.all([
    db.user.findMany({ where: { role: { in: [Role.BRANCH_PASTOR, Role.GENERAL_OVERSEER] } }, orderBy: { fullName: "asc" } }),
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.preachingAssignment.findMany({
      where: hq ? {} : { branchId: session.branchId ?? "__none__" },
      orderBy: { date: "desc" },
      include: { pastor: { select: { fullName: true } }, branch: { select: { name: true } } },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pastoral &amp; Leadership</h1>
          <p className="text-sm text-slate-500">Pastor records and preaching assignment scheduling.</p>
        </div>
        {hq && <ScheduleAssignmentModal pastors={pastors} branches={branches} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pastors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pastors.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.fullName}</span>
              <Badge color="blue">{ROLE_LABELS[p.role]}</Badge>
            </div>
          ))}
          {pastors.length === 0 && <p className="text-sm text-slate-500">No pastors recorded yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Pastor</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{a.pastor.fullName}</td>
                  <td className="px-5 py-3 text-slate-500">{a.branch.name}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(a.date)}</td>
                  <td className="px-5 py-3">
                    <Badge color={a.status === "COMPLETED" ? "green" : "blue"}>{a.status}</Badge>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No assignments scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
