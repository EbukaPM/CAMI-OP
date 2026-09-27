import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveHq } from "@/lib/rbac";
import { ScheduleAssignmentModal } from "./schedule-assignment-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate, ROLE_LABELS } from "@/lib/utils";
import { Role } from "@prisma/client";

export default async function PastoralPage() {
  const session = await requireSession();
  const hq = effectiveHq(session);

  // HQ monitors pastors and leaders church-wide; a branch's own leadership
  // monitors the leaders/workers in their branch (plus their own record).
  const peopleWhere = hq
    ? { role: { in: [Role.BRANCH_PASTOR, Role.GENERAL_OVERSEER, Role.MINISTRY_LEADER] } }
    : {
        OR: [
          { id: session.userId },
          { branchId: session.branchId ?? "__none__", role: { in: [Role.MINISTRY_LEADER, Role.WORKER] } },
        ],
      };

  const [people, pastorsForAssignment, branches, assignments] = await Promise.all([
    db.user.findMany({ where: peopleWhere, orderBy: { fullName: "asc" } }),
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
      <PageHeader
        title="Pastoral & Leadership"
        description="Pastor and leader records, career history, and preaching assignments."
        actions={hq ? <ScheduleAssignmentModal pastors={pastorsForAssignment} branches={branches} /> : undefined}
      />

      <Card>
        <CardHeader>
          <CardTitle>{hq ? "Pastors & leaders" : "Your branch's leaders"} ({people.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/pastoral/${p.id}`}
              className="flex items-center justify-between rounded-lg border-b border-slate-100 py-2 px-2 -mx-2 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.fullName}</span>
              <Badge color="blue">{ROLE_LABELS[p.role]}</Badge>
            </Link>
          ))}
          {people.length === 0 && <p className="text-sm text-slate-500">No one recorded yet.</p>}
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
