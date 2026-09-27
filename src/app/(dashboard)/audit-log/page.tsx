import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ entityType?: string; page?: string }> }) {
  const session = await requireSession();
  if (session.isViewOnly) throw new ForbiddenError("Not available while viewing a branch's portal.");
  if (!canManageUsers(session)) throw new ForbiddenError("Audit logs are restricted to Headquarters administrators.");
  const sp = await searchParams;

  const [entityTypes] = await Promise.all([db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } })]);
  const where = sp.entityType ? { entityType: sp.entityType } : {};
  const { page, skip, take } = pageSkipTake(sp.page, 25);

  const [logs, totalCount] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { actor: { select: { fullName: true, role: true } } } }),
    db.auditLog.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Tamper-resistant record of sensitive actions across the system." />

      <div className="w-56">
        <Field label="Entity type">
          <AutoSubmitSelect paramName="entityType" defaultValue={sp.entityType ?? ""}>
            <option value="">All</option>
            {entityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </AutoSubmitSelect>
        </Field>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events ({totalCount})</CardTitle>
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
          <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/audit-log" searchParams={sp} />
        </CardContent>
      </Card>
    </div>
  );
}
