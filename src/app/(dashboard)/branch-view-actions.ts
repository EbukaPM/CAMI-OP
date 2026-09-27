"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isHqRole, ForbiddenError } from "@/lib/rbac";
import { setViewingBranch, clearViewingBranch } from "@/lib/branch-view";
import { writeAuditLog } from "@/lib/audit";

/**
 * Lets an HQ user step into a branch's portal: same module pages a branch
 * pastor would see, scoped to just that branch, but read-only — every
 * mutating action rejects while this mode is active (see
 * requireWriteSession in lib/auth.ts). Logged both ways so there's a record
 * of who looked at a branch's portal and when.
 */
export async function enterBranchViewAction(formData: FormData) {
  const session = await requireSession();
  if (!isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can browse a branch's portal.");

  const branchId = String(formData.get("branchId"));
  const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } });
  if (!branch) throw new ForbiddenError("Branch not found.");

  await setViewingBranch(branchId);
  await writeAuditLog({
    actor: session,
    action: "HQ_ENTERED_BRANCH_VIEW",
    entityType: "Branch",
    entityId: branchId,
    after: { branchName: branch.name },
  });

  redirect("/dashboard");
}

export async function exitBranchViewAction() {
  const session = await requireSession();
  await clearViewingBranch();
  if (session.isViewOnly && session.realBranchId !== undefined) {
    await writeAuditLog({
      actor: { ...session, branchId: session.realBranchId ?? null, role: session.realRole ?? session.role },
      action: "HQ_EXITED_BRANCH_VIEW",
      entityType: "Branch",
      entityId: session.branchId,
    });
  }
  redirect("/dashboard");
}
