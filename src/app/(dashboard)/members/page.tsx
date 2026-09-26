import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { createMemberAction } from "./actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorText, Field, Input, Select } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; branchId?: string }>;
}) {
  const session = await requireSession();
  const { error, branchId: filterBranchId } = await searchParams;
  const hq = isHqRole(session.role);

  const branches = hq
    ? await db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  const effectiveBranchId = hq ? filterBranchId : session.branchId ?? undefined;

  const members = await db.member.findMany({
    where: effectiveBranchId ? { branchId: effectiveBranchId } : hq ? {} : { branchId: "__none__" },
    orderBy: { createdAt: "desc" },
    include: { branch: { select: { name: true } } },
    take: 200,
  });

  const defaultBranchId = hq ? "" : session.branchId ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Members</h1>
        <p className="text-sm text-slate-500">
          {hq ? "Church-wide member records, filterable by branch." : "Members of your branch."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a member</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMemberAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {hq ? (
              <Field label="Branch">
                <Select name="branchId" required defaultValue="">
                  <option value="" disabled>
                    Select branch
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="branchId" value={defaultBranchId} />
            )}
            <Field label="First name">
              <Input name="firstName" required />
            </Field>
            <Field label="Last name">
              <Input name="lastName" required />
            </Field>
            <Field label="Phone">
              <Input name="phone" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
            <Field label="Date of birth">
              <Input name="dateOfBirth" type="date" />
            </Field>
            <Field label="Gender">
              <Select name="gender" defaultValue="">
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
            </Field>
            <Field label="Occupation">
              <Input name="occupation" />
            </Field>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit">Add member</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Name</th>
                {hq && <th className="px-5 py-3">Branch</th>}
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {m.firstName} {m.lastName}
                  </td>
                  {hq && <td className="px-5 py-3 text-slate-500">{m.branch.name}</td>}
                  <td className="px-5 py-3 text-slate-500">{m.phone ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge color={m.membershipStatus === "ACTIVE" ? "green" : "slate"}>{m.membershipStatus}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={hq ? 5 : 4} className="px-5 py-8 text-center text-slate-500">
                    No members recorded yet.
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
