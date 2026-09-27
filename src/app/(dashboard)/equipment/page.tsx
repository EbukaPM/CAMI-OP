import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, canViewEquipmentValuation, canManageBranch } from "@/lib/rbac";
import { getEquipmentValuation } from "@/lib/data/equipment";
import { disposeAssetAction } from "./actions";
import { RegisterAssetModal } from "./register-asset-modal";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Paperclip } from "lucide-react";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await requireSession();
  const { branchId: filterBranchId } = await searchParams;
  const hq = isHqRole(session.role);
  const scopedBranchId = hq ? filterBranchId : session.branchId ?? undefined;
  const branchWhere = scopedBranchId ? { branchId: scopedBranchId } : hq ? {} : { branchId: "__none__" };

  const valuation = canViewEquipmentValuation(session) ? await getEquipmentValuation(session) : null;

  const [branches, assets] = await Promise.all([
    hq ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.asset.findMany({
      where: { ...branchWhere, isDisposed: false },
      orderBy: { createdAt: "desc" },
      include: { branch: { select: { name: true } }, attachments: true },
      take: 200,
    }),
  ]);

  const defaultBranchId = hq ? "" : session.branchId ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Equipment &amp; Assets</h1>
          <p className="text-sm text-slate-500">Register, location, custodian, and condition — by branch.</p>
        </div>
        <RegisterAssetModal branches={branches} defaultBranchId={defaultBranchId} />
      </div>

      {valuation ? (
        <StatCard
          label={valuation.scope === "CHURCH_WIDE" ? "Church-wide Equipment Worth (restricted)" : `Equipment Worth — ${valuation.branchName} (restricted)`}
          value={formatCurrency(valuation.totalWorth)}
          sub={`${valuation.totalCount} active asset${valuation.totalCount === 1 ? "" : "s"}. Visible only to ${
            valuation.scope === "CHURCH_WIDE" ? "the General Overseer" : "this branch's Pastor"
          }.`}
        />
      ) : (
        <Card>
          <CardContent className="text-sm text-slate-500">
            Total equipment worth is a restricted figure — visible only to a Branch Pastor (their own branch) and the
            General Overseer (church-wide), enforced at the permission layer per the PRD.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assets ({assets.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Name</th>
                {hq && <th className="px-5 py-3">Branch</th>}
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Condition</th>
                <th className="px-5 py-3">Purchased</th>
                <th className="px-5 py-3">Files</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{a.name}</td>
                  {hq && <td className="px-5 py-3 text-slate-500">{a.branch.name}</td>}
                  <td className="px-5 py-3 text-slate-500">{a.category}</td>
                  <td className="px-5 py-3">
                    <Badge color={a.condition === "NEEDS_REPAIR" ? "amber" : "green"}>{a.condition.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(a.purchaseDate)}</td>
                  <td className="px-5 py-3">
                    {a.attachments.length > 0 ? (
                      <a
                        href={`/api/files/${a.attachments[0].fileAssetId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        <Paperclip size={14} /> View
                      </a>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canManageBranch(session, a.branchId) && (
                      <form action={disposeAssetAction}>
                        <input type="hidden" name="assetId" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Mark disposed
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No equipment registered yet.
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
