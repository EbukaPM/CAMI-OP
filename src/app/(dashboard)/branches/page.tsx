import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { CreateBranchModal } from "./create-branch-modal";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function BranchesPage() {
  const session = await requireSession();
  const canCreate = canManageUsers(session);

  const branches = await db.branch.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, users: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Branches</h1>
          <p className="text-sm text-slate-500">Headquarters and branch structure across the church.</p>
        </div>
        {canCreate && <CreateBranchModal />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All branches ({branches.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Members</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Since</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{b.name}</td>
                  <td className="px-5 py-3 text-slate-500">{b.code}</td>
                  <td className="px-5 py-3 text-slate-500">{[b.city, b.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-5 py-3 text-slate-500">{b._count.members}</td>
                  <td className="px-5 py-3">
                    <Badge color={b.status === "ACTIVE" ? "green" : "slate"}>{b.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(b.createdAt)}</td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No branches yet.
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
