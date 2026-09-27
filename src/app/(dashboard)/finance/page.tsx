import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { decideExpenseAction } from "./actions";
import { RecordGivingModal } from "./record-giving-modal";
import { SubmitExpenseModal } from "./submit-expense-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, LinkButton, StatCard } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileDown, TrendingUp } from "lucide-react";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; givingPage?: string; expensePage?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const hq = isHqRole(session.role) && !session.isViewOnly;
  const scopedBranchId = hq ? sp.branchId : session.branchId ?? undefined;
  const branchWhere = scopedBranchId ? { branchId: scopedBranchId } : hq ? {} : { branchId: "__none__" };

  const giving = pageSkipTake(sp.givingPage);
  const expense = pageSkipTake(sp.expensePage);

  const [branches, categories, givingAgg, expenseAgg, givingByCategory, givingRecords, givingCount, expenseRecords, expenseCount] = await Promise.all([
    hq ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.givingCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.givingRecord.aggregate({ where: branchWhere, _sum: { amount: true } }),
    db.expenseRecord.aggregate({ where: { ...branchWhere, status: "APPROVED" }, _sum: { amount: true } }),
    db.givingRecord.groupBy({ by: ["categoryId"], where: branchWhere, _sum: { amount: true } }),
    db.givingRecord.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      skip: giving.skip,
      take: giving.take,
      include: { category: true, branch: { select: { name: true } } },
    }),
    db.givingRecord.count({ where: branchWhere }),
    db.expenseRecord.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      skip: expense.skip,
      take: expense.take,
      include: { branch: { select: { name: true } } },
    }),
    db.expenseRecord.count({ where: branchWhere }),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const expenseByCategory = await db.expenseRecord.groupBy({ by: ["category"], where: { ...branchWhere, status: "APPROVED" }, _sum: { amount: true } });

  const totalGiving = Number(givingAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);
  const defaultBranchId = hq ? "" : session.branchId ?? "";
  const pdfHref = `/api/reports/finance/pdf${scopedBranchId ? `?branchId=${scopedBranchId}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Giving"
        description={hq ? "Consolidated income and expenditure across branches." : "Your branch's giving and expenses."}
        actions={
          <>
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
          </>
        }
      />

      {hq && (
        <div className="max-w-xs">
          <Field label="Branch">
            <AutoSubmitSelect paramName="branchId" defaultValue={scopedBranchId ?? ""}>
              <option value="">All branches (consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Giving" value={formatCurrency(totalGiving)} />
        <StatCard label="Approved Expenses" value={formatCurrency(totalExpense)} />
        <StatCard label="Net" value={formatCurrency(totalGiving - totalExpense)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Giving by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {givingByCategory.map((g) => (
              <div key={g.categoryId} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">{categoryNameById.get(g.categoryId) ?? "Other"}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(g._sum.amount?.toString() ?? 0)}</span>
              </div>
            ))}
            {givingByCategory.length === 0 && <p className="text-sm text-slate-500">No giving recorded yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved expenses by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenseByCategory.map((e) => (
              <div key={e.category} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">{e.category}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(e._sum.amount?.toString() ?? 0)}</span>
              </div>
            ))}
            {expenseByCategory.length === 0 && <p className="text-sm text-slate-500">No approved expenses yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
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
              {expenseRecords.map((e) => (
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
              {expenseRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No expenses submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={expense.page} pageSize={expense.take} totalCount={expenseCount} basePath="/finance" searchParams={sp} pageParam="expensePage" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giving</CardTitle>
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
              {givingRecords.map((g) => (
                <tr key={g.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  {hq && <td className="px-5 py-3 text-slate-500">{g.branch.name}</td>}
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{g.category.name}</td>
                  <td className="px-5 py-3 text-slate-500">{formatCurrency(g.amount.toString())}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(g.createdAt)}</td>
                </tr>
              ))}
              {givingRecords.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    No giving recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={giving.page} pageSize={giving.take} totalCount={givingCount} basePath="/finance" searchParams={sp} pageParam="givingPage" />
        </CardContent>
      </Card>
    </div>
  );
}
