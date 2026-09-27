import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { setUserActiveAction } from "./actions";
import { CreateUserModal } from "./create-user-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field } from "@/components/ui/primitives";
import { ROLE_LABELS, formatDate } from "@/lib/utils";
import { Role } from "@prisma/client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; page?: string }>;
}) {
  const session = await requireSession();
  if (session.isViewOnly) throw new ForbiddenError("Not available while viewing a branch's portal.");
  if (!canManageUsers(session)) throw new ForbiddenError();
  const sp = await searchParams;

  const roleFilter = sp.role && sp.role in Role ? (sp.role as Role) : undefined;
  const statusFilter = sp.status === "active" ? true : sp.status === "inactive" ? false : undefined;
  const where = { ...(roleFilter ? { role: roleFilter } : {}), ...(statusFilter !== undefined ? { isActive: statusFilter } : {}) };
  const { page, skip, take } = pageSkipTake(sp.page);

  const [users, branches, totalCount] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { branch: { select: { name: true } } } }),
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Create accounts and control role + branch scope." actions={<CreateUserModal branches={branches} />} />

      <div className="flex flex-wrap gap-4">
        <div className="w-56">
          <Field label="Role">
            <AutoSubmitSelect paramName="role" defaultValue={sp.role ?? ""}>
              <option value="">All roles</option>
              {Object.values(Role).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </AutoSubmitSelect>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Status">
            <AutoSubmitSelect paramName="status" defaultValue={sp.status ?? ""}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </AutoSubmitSelect>
          </Field>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users ({totalCount})</CardTitle>
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
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No users match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/users" searchParams={sp} />
        </CardContent>
      </Card>
    </div>
  );
}
