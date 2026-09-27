import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { CreateMemberModal } from "./create-member-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { MembershipStatus, Prisma } from "@prisma/client";

const SORTS: Record<string, Prisma.MemberOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name_asc: { firstName: "asc" },
  name_desc: { firstName: "desc" },
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; status?: string; sort?: string; page?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const hq = isHqRole(session.role) && !session.isViewOnly;

  const branches = hq ? await db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];

  const effectiveBranchId = hq ? sp.branchId : session.branchId ?? undefined;
  const statusFilter = sp.status && sp.status in MembershipStatus ? (sp.status as MembershipStatus) : undefined;
  const where = {
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : hq ? {} : { branchId: "__none__" }),
    ...(statusFilter ? { membershipStatus: statusFilter } : {}),
  };
  const sort = SORTS[sp.sort ?? ""] ?? SORTS.newest;
  const { page, skip, take } = pageSkipTake(sp.page);

  const [members, totalCount] = await Promise.all([
    db.member.findMany({ where, orderBy: sort, skip, take, include: { branch: { select: { name: true } } } }),
    db.member.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={hq ? "Church-wide member records, filterable by branch." : "Members of your branch."}
        actions={!session.isViewOnly ? <CreateMemberModal branches={branches} defaultBranchId={hq ? "" : session.branchId ?? ""} /> : undefined}
      />

      <div className="flex flex-wrap gap-4">
        {hq && (
          <div className="w-56">
            <Field label="Branch">
              <AutoSubmitSelect paramName="branchId" defaultValue={sp.branchId ?? ""}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </Field>
          </div>
        )}
        <div className="w-48">
          <Field label="Status">
            <AutoSubmitSelect paramName="status" defaultValue={sp.status ?? ""}>
              <option value="">All statuses</option>
              {Object.values(MembershipStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </AutoSubmitSelect>
          </Field>
        </div>
        <div className="w-48">
          <Field label="Sort by">
            <AutoSubmitSelect paramName="sort" defaultValue={sp.sort ?? "newest"}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
            </AutoSubmitSelect>
          </Field>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({totalCount})</CardTitle>
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
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/members/${m.id}`} className="text-slate-900 hover:underline dark:text-slate-100">
                      {m.firstName} {m.lastName}
                    </Link>
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
          <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/members" searchParams={sp} />
        </CardContent>
      </Card>
    </div>
  );
}
