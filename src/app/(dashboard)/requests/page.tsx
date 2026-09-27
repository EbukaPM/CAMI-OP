import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, canManageBranch } from "@/lib/rbac";
import { decideRequestAction } from "./actions";
import { CreateRequestModal } from "./create-request-modal";
import { ESCALATION_THRESHOLD_NGN } from "@/lib/constants";
import { Badge, Button, Card, CardContent } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_COLOR: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  SUBMITTED: "slate",
  VERIFICATION: "amber",
  HQ_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
  DISBURSED: "green",
};

export default async function RequestsPage() {
  const session = await requireSession();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Requests &amp; Approvals</h1>
          <p className="text-sm text-slate-500">
            Branch → Verification → Headquarters Approval → Approval/Rejection → Disbursement Confirmation.
          </p>
        </div>
        <CreateRequestModal branches={branches} defaultBranchId={defaultBranchId} />
      </div>

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
