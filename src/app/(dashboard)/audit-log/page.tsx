import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function AuditLogPage() {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Audit logs are restricted to Headquarters administrators.");

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { fullName: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Audit Log</h1>
        <p className="text-sm text-slate-500">Tamper-resistant record of sensitive actions across the system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest 200 events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-3 text-slate-500">{formatDate(l.createdAt)}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{l.actor?.fullName ?? "System"}</td>
                  <td className="px-5 py-3">
                    <Badge color="blue">{l.action}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {l.entityType}
                    {l.entityId ? ` #${l.entityId.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No activity logged yet.
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
