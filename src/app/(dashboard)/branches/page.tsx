import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { CreateBranchModal } from "./create-branch-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { Prisma } from "@prisma/client";

const SORTS: Record<string, Prisma.BranchOrderByWithRelationInput> = {
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string }> }) {
  const session = await requireSession();
  if (session.isViewOnly) throw new ForbiddenError("Not available while viewing a branch's portal — this lists every branch.");
  const canCreate = canManageUsers(session);
  const sp = await searchParams;
  const { page, skip, take } = pageSkipTake(sp.page);
  const sort = SORTS[sp.sort ?? ""] ?? SORTS.name_asc;

  const [branches, totalCount] = await Promise.all([
    db.branch.findMany({ orderBy: sort, skip, take, include: { _count: { select: { members: true, users: true } } } }),
    db.branch.count(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Headquarters and branch structure across the church."
        actions={canCreate ? <CreateBranchModal /> : undefined}
      />

      <div className="max-w-xs">
        <Field label="Sort by">
          <AutoSubmitSelect paramName="sort" defaultValue={sp.sort ?? "name_asc"}>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </AutoSubmitSelect>
        </Field>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All branches ({totalCount})</CardTitle>
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
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/branches/${b.id}`} className="text-slate-900 hover:underline dark:text-slate-100">
                      {b.name}
                    </Link>
                  </td>
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
          <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/branches" searchParams={sp} />
        </CardContent>
      </Card>
    </div>
  );
}
