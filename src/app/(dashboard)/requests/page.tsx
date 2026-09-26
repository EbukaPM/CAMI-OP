import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, canManageBranch } from "@/lib/rbac";
import { createRequestAction, decideRequestAction } from "./actions";
import { ESCALATION_THRESHOLD_NGN } from "@/lib/constants";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorText, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RequestType, RequestPriority } from "@prisma/client";

const STATUS_COLOR: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  SUBMITTED: "slate",
  VERIFICATION: "amber",
  HQ_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
  DISBURSED: "green",
};

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { error } = await searchParams;
  const hq = isHqRole(session.role);

  const [branches, requests] = await Promise.all([
    hq ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.request.findMany({
      where: hq ? {} : { branchId: session.branchId ?? "__none__" },
      orderBy: { createdAt: "desc" },
      include: { branch: { select: { name: true } }, createdBy: { select: { fullName: true } }, approvalActions: { orderBy: { createdAt: "asc" }, include: { actor: { select: { fullName: true } } } } },
      take: 100,
    }),
  ]);

  const defaultBranchId = hq ? "" : session.branchId ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Requests &amp; Approvals</h1>
        <p className="text-sm text-slate-500">
          Branch → Verification → Headquarters Approval → Approval/Rejection → Disbursement Confirmation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a request</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRequestAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Field label="Type">
              <Select name="type" required defaultValue={RequestType.FUNDS}>
                {Object.values(RequestType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <Input name="title" required placeholder="Sanctuary roof repair" />
            </Field>
            <Field label="Priority">
              <Select name="priority" required defaultValue={RequestPriority.NORMAL}>
                {Object.values(RequestPriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (NGN, optional)">
              <Input name="amount" type="number" min="0" step="0.01" />
            </Field>
            <Field label="Requested date">
              <Input name="requestedDate" type="date" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea name="description" required rows={3} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit">Submit request</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {requests.map((r) => {
          const canVerify = r.status === "SUBMITTED" && (canManageBranch(session, r.branchId) || hq);
          const canApprove = r.status === "HQ_REVIEW" && hq;
          const canDisburse = r.status === "APPROVED" && hq;
          const amount = r.amount ? Number(r.amount) : 0;
          const needsOverseer = amount > ESCALATION_THRESHOLD_NGN;

          return (
            <Card key={r.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {r.branch.name} · {r.type} · by {r.createdBy.fullName} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.amount && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatCurrency(r.amount.toString())}</span>}
                    <Badge color={STATUS_COLOR[r.status]}>{r.status.replace("_", " ")}</Badge>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{r.description}</p>

                {needsOverseer && r.status === "HQ_REVIEW" && (
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Above ₦{ESCALATION_THRESHOLD_NGN.toLocaleString()} — requires General Overseer approval.
                  </p>
                )}

                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50">
                  {r.approvalActions.map((a) => (
                    <p key={a.id}>
                      {formatDate(a.createdAt)} — {a.actor.fullName} {a.action.toLowerCase()}
                      {a.comment ? `: ${a.comment}` : ""}
                    </p>
                  ))}
                </div>

                {(canVerify || canApprove || canDisburse) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canVerify && (
                      <form action={decideRequestAction}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <input type="hidden" name="action" value="VERIFY" />
                        <Button type="submit" size="sm" variant="secondary">
                          Verify → send to HQ
                        </Button>
                      </form>
                    )}
                    {canApprove && (
                      <>
                        <form action={decideRequestAction}>
                          <input type="hidden" name="requestId" value={r.id} />
                          <input type="hidden" name="action" value="APPROVE" />
                          <Button type="submit" size="sm">
                            Approve
                          </Button>
                        </form>
                        <form action={decideRequestAction}>
                          <input type="hidden" name="requestId" value={r.id} />
                          <input type="hidden" name="action" value="REJECT" />
                          <Button type="submit" size="sm" variant="danger">
                            Reject
                          </Button>
                        </form>
                      </>
                    )}
                    {canDisburse && (
                      <form action={decideRequestAction}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <input type="hidden" name="action" value="DISBURSE" />
                        <Button type="submit" size="sm" variant="secondary">
                          Confirm disbursement
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {requests.length === 0 && <p className="text-sm text-slate-500">No requests submitted yet.</p>}
      </div>
    </div>
  );
}
