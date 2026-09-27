import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { decideExpenseAction } from "./actions";
import { RecordGivingModal } from "./record-giving-modal";
import { SubmitExpenseModal } from "./submit-expense-modal";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LinkButton, StatCard } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileDown, TrendingUp } from "lucide-react";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await requireSession();
  const { branchId: filterBranchId } = await searchParams;
  const hq = isHqRole(session.role);
  const scopedBranchId = hq ? filterBranchId : session.branchId ?? undefined;
  const branchWhere = scopedBranchId ? { branchId: scopedBranchId } : hq ? {} : { branchId: "__none__" };

  const [branches, categories, givingAgg, expenseAgg, recentGiving, recentExpenses] = await Promise.all([
    hq ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.givingCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.givingRecord.aggregate({ where: branchWhere, _sum: { amount: true } }),
    db.expenseRecord.aggregate({ where: { ...branchWhere, status: "APPROVED" }, _sum: { amount: true } }),
    db.givingRecord.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { category: true, branch: { select: { name: true } } },
    }),
    db.expenseRecord.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { branch: { select: { name: true } } },
    }),
  ]);

  const totalGiving = Number(givingAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);
  const defaultBranchId = hq ? "" : session.branchId ?? "";
  const pdfHref = `/api/reports/finance/pdf${scopedBranchId ? `?branchId=${scopedBranchId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Finance &amp; Giving</h1>
          <p className="text-sm text-slate-500">
            {hq ? "Consolidated income and expenditure across branches." : "Your branch's giving and expenses."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {scopedBranchId && (
            <LinkButton href={`/branches/${scopedBranchId}`} variant="ghost">
              <TrendingUp size={14} /> Monthly branch report
            </LinkButton>
          )}
          <LinkButton href={pdfHref} variant="ghost">
            <FileDown size={14} /> Download PDF
          </LinkButton>
          <SubmitExpenseModal branches={branches} defaultBranchId={defaultBranchId} />
          <RecordGivingModal branches={branches} categories={categories} defaultBranchId={defaultBranchId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Giving" value={formatCurrency(totalGiving)} />
        <StatCard label="Approved Expenses" value={formatCurrency(totalExpense)} />
        <StatCard label="Net" value={formatCurrency(totalGiving - totalExpense)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                {hq && <th className="px-5 py-3">Branch</th>}
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                {hq && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  {hq && <td className="px-5 py-3 text-slate-500">{e.branch.name}</td>}
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{e.category}</td>
                  <td className="px-5 py-3 text-slate-500">{formatCurrency(e.amount.toString())}</td>
                  <td className="px-5 py-3">
                    <Badge color={e.status === "APPROVED" ? "green" : e.status === "REJECTED" ? "red" : "amber"}>{e.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(e.createdAt)}</td>
                  {hq && (
                    <td className="px-5 py-3 text-right">
                      {e.status === "SUBMITTED" && (
                        <div className="flex justify-end gap-2">
                          <form action={decideExpenseAction}>
                            <input type="hidden" name="expenseId" value={e.id} />
                            <input type="hidden" name="decision" value="APPROVED" />
                            <Button type="submit" size="sm" variant="secondary">
                              Approve
                            </Button>
                          </form>
                          <form action={decideExpenseAction}>
                            <input type="hidden" name="expenseId" value={e.id} />
                            <input type="hidden" name="decision" value="REJECTED" />
                            <Button type="submit" size="sm" variant="danger">
                              Reject
                            </Button>
                          </form>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {recentExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No expenses submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent giving</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <tr>
                {hq && <th className="px-5 py-3">Branch</th>}
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentGiving.map((g) => (
                <tr key={g.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  {hq && <td className="px-5 py-3 text-slate-500">{g.branch.name}</td>}
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{g.category.name}</td>
                  <td className="px-5 py-3 text-slate-500">{formatCurrency(g.amount.toString())}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(g.createdAt)}</td>
                </tr>
              ))}
              {recentGiving.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No giving recorded yet.
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
