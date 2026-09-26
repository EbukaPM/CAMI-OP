import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { createBranchAction } from "./actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorText, Field, Input } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { error } = await searchParams;
  const canCreate = canManageUsers(session);

  const branches = await db.branch.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, users: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Branches</h1>
        <p className="text-sm text-slate-500">Headquarters and branch structure across the church.</p>
      </div>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Register a new branch</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createBranchAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Branch name">
                <Input name="name" required placeholder="CAMI Church — Lekki" />
              </Field>
              <Field label="Branch code">
                <Input name="code" required placeholder="LEKKI-01" />
              </Field>
              <Field label="Address">
                <Input name="address" placeholder="Street address" />
              </Field>
              <Field label="City">
                <Input name="city" placeholder="City" />
              </Field>
              <Field label="State">
                <Input name="state" placeholder="State" />
              </Field>
              <Field label="Contact phone">
                <Input name="contactPhone" placeholder="+234..." />
              </Field>
              <Field label="Contact email">
                <Input name="contactEmail" type="email" placeholder="branch@camichurch.org" />
              </Field>
              <Field label="Service schedule">
                <Input name="serviceSchedule" placeholder="Sundays 8am & 10am" />
              </Field>
              <div className="sm:col-span-2">
                <ErrorText>{error}</ErrorText>
                <Button type="submit">Create branch</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
