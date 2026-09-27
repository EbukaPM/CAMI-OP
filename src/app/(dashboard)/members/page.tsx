import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { CreateMemberModal } from "./create-member-modal";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const session = await requireSession();
  const { branchId: filterBranchId } = await searchParams;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Members</h1>
          <p className="text-sm text-slate-500">
            {hq ? "Church-wide member records, filterable by branch." : "Members of your branch."}
          </p>
        </div>
        <CreateMemberModal branches={branches} defaultBranchId={hq ? "" : session.branchId ?? ""} />
      </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
