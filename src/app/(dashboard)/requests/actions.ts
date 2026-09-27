"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role, RequestType, RequestPriority } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { canManageBranch, isHqRole, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { ESCALATION_THRESHOLD_NGN } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

const requestSchema = z.object({
  branchId: z.string().min(1),
  type: z.nativeEnum(RequestType),
  title: z.string().min(2),
  description: z.string().min(2),
  amount: z.coerce.number().optional(),
  priority: z.nativeEnum(RequestPriority),
  requestedDate: z.string().optional(),
});

export async function createRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = requestSchema.safeParse({ ...raw, amount: raw.amount || undefined });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (!canManageBranch(session, data.branchId) && session.role !== Role.FINANCE_OFFICER && session.role !== Role.MINISTRY_LEADER) {
    throw new ForbiddenError("You can only submit requests for your own branch.");
  }
  if (!isHqRole(session.role) && session.branchId !== data.branchId) {
    throw new ForbiddenError("You can only submit requests for your own branch.");
  }

  const request = await db.request.create({
    data: {
      branchId: data.branchId,
      createdById: session.userId,
      type: data.type,
      title: data.title,
      description: data.description,
      amount: data.amount ?? null,
      priority: data.priority,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : null,
    },
  });

  await db.approvalAction.create({
    data: { requestId: request.id, actorId: session.userId, action: "COMMENT", comment: "Request submitted." },
  });

  await writeAuditLog({
    actor: session,
    action: "REQUEST_SUBMITTED",
    entityType: "Request",
    entityId: request.id,
    after: { branchId: data.branchId, type: data.type, amount: data.amount },
  });

  revalidatePath("/requests");
  return { success: true };
}

const decisionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["VERIFY", "APPROVE", "REJECT", "DISBURSE"]),
  comment: z.string().optional(),
});

export async function decideRequestAction(formData: FormData) {
  const session = await requireSession();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/requests");
  const { requestId, action, comment } = parsed.data as z.infer<typeof decisionSchema>;

  const request = await db.request.findUnique({ where: { id: requestId } });
  if (!request) redirect("/requests");

  if (action === "VERIFY") {
    if (!canManageBranch(session, request!.branchId) && !isHqRole(session.role)) {
      throw new ForbiddenError("Only your branch's leadership or Headquarters can verify this request.");
    }
    await db.request.update({ where: { id: requestId }, data: { status: "HQ_REVIEW" } });
  } else if (action === "APPROVE" || action === "REJECT") {
    if (!isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can approve or reject requests.");
    const amount = request!.amount ? Number(request!.amount) : 0;
    if (action === "APPROVE" && amount > ESCALATION_THRESHOLD_NGN && session.role !== Role.GENERAL_OVERSEER) {
      throw new ForbiddenError(
        `Requests above ₦${ESCALATION_THRESHOLD_NGN.toLocaleString()} require the General Overseer's approval.`
      );
    }
    await db.request.update({ where: { id: requestId }, data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED" } });
  } else if (action === "DISBURSE") {
    if (!isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can confirm disbursement.");
    await db.request.update({ where: { id: requestId }, data: { status: "DISBURSED" } });
  }

  await db.approvalAction.create({
    data: { requestId, actorId: session.userId, action, comment: comment || null },
  });

  await writeAuditLog({
    actor: session,
    action: `REQUEST_${action}`,
    entityType: "Request",
    entityId: requestId,
    before: { status: request!.status },
  });

  redirect("/requests");
}
