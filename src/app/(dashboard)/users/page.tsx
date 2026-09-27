import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { setUserActiveAction } from "./actions";
import { CreateUserModal } from "./create-user-modal";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { ROLE_LABELS, formatDate } from "@/lib/utils";

export default async function UsersPage() {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError();

  const [users, branches] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, include: { branch: { select: { name: true } } } }),
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Users &amp; Roles</h1>
          <p className="text-sm text-slate-500">Create accounts and control role + branch scope.</p>
        </div>
        <CreateUserModal branches={branches} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last login</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{u.fullName}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{ROLE_LABELS[u.role]}</td>
                  <td className="px-5 py-3 text-slate-500">{u.branch?.name ?? "HQ"}</td>
                  <td className="px-5 py-3">
                    <Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Deactivated"}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(u.lastLoginAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {u.id !== session.userId && (
                      <form action={setUserActiveAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="isActive" value={String(!u.isActive)} />
                        <Button type="submit" size="sm" variant={u.isActive ? "danger" : "secondary"}>
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
