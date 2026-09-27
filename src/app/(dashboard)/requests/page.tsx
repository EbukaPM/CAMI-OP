import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, canManageBranch } from "@/lib/rbac";
import { decideRequestAction } from "./actions";
import { CreateRequestModal } from "./create-request-modal";
import { ESCALATION_THRESHOLD_NGN } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Button, Card, CardContent, Field } from "@/components/ui/primitives";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RequestStatus, RequestType } from "@prisma/client";

const STATUS_COLOR: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  SUBMITTED: "slate",
  VERIFICATION: "amber",
  HQ_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
  DISBURSED: "green",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const hq = isHqRole(session.role) && !session.isViewOnly;

  const statusFilter = sp.status && sp.status in RequestStatus ? (sp.status as RequestStatus) : undefined;
  const typeFilter = sp.type && sp.type in RequestType ? (sp.type as RequestType) : undefined;
  const where = {
    ...(hq ? {} : { branchId: session.branchId ?? "__none__" }),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };
  const { page, skip, take } = pageSkipTake(sp.page, 10);

  const [branches, requests, totalCount] = await Promise.all([
    hq ? db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    db.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { branch: { select: { name: true } }, createdBy: { select: { fullName: true } }, approvalActions: { orderBy: { createdAt: "asc" }, include: { actor: { select: { fullName: true } } } } },
    }),
    db.request.count({ where }),
  ]);

  const defaultBranchId = hq ? "" : session.branchId ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests & Approvals"
        description="Branch → Verification → Headquarters Approval → Approval/Rejection → Disbursement Confirmation."
        actions={!session.isViewOnly ? <CreateRequestModal branches={branches} defaultBranchId={defaultBranchId} /> : undefined}
      />

      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <Field label="Status">
            <AutoSubmitSelect paramName="status" defaultValue={sp.status ?? ""}>
              <option value="">All statuses</option>
              {Object.values(RequestStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </AutoSubmitSelect>
          </Field>
        </div>
        <div className="w-48">
          <Field label="Type">
            <AutoSubmitSelect paramName="type" defaultValue={sp.type ?? ""}>
              <option value="">All types</option>
              {Object.values(RequestType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </AutoSubmitSelect>
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((r) => {
          const canVerify = !session.isViewOnly && r.status === "SUBMITTED" && (canManageBranch(session, r.branchId) || hq);
          const canApprove = !session.isViewOnly && r.status === "HQ_REVIEW" && hq;
          const canDisburse = !session.isViewOnly && r.status === "APPROVED" && hq;
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
        {requests.length === 0 && <p className="text-sm text-slate-500">No requests match these filters.</p>}
      </div>
      <Card>
        <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/requests" searchParams={sp} />
      </Card>
    </div>
  );
}
