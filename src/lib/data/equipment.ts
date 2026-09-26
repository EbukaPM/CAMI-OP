import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { getEquipmentValuationScope, ForbiddenError } from "@/lib/rbac";
import type { SessionPayload } from "@/lib/auth";

export type EquipmentValuationResult = {
  scope: "CHURCH_WIDE" | "BRANCH";
  branchId?: string;
  branchName?: string;
  totalCount: number;
  totalWorth: string; // decimal-as-string to avoid float precision issues in transport
};

/**
 * The restricted equipment valuation summary (PRD Section 3.3 / FR-12).
 *
 * This is the one function that is allowed to compute a total-worth figure.
 * It refuses any role outside the two the PRD names, at the data layer —
 * not the page — and logs every successful view, since PRD 3.3 calls
 * viewing equipment worth a sensitive, auditable action.
 */
export async function getEquipmentValuation(session: SessionPayload): Promise<EquipmentValuationResult> {
  const grant = getEquipmentValuationScope(session);
  if (!grant) {
    throw new ForbiddenError(
      "Equipment valuation is restricted to the Senior Pastor/General Overseer (church-wide) and Branch Pastors (own branch only)."
    );
  }

  if (grant.scope === "CHURCH_WIDE") {
    const agg = await db.asset.aggregate({
      where: { isDisposed: false },
      _count: { _all: true },
      _sum: { purchaseValue: true },
    });

    await writeAuditLog({
      actor: session,
      action: "EQUIPMENT_VALUATION_VIEWED",
      entityType: "AssetValuation",
      after: { scope: "CHURCH_WIDE" },
    });

    return {
      scope: "CHURCH_WIDE",
      totalCount: agg._count._all,
      totalWorth: (agg._sum.purchaseValue ?? 0).toString(),
    };
  }

  const branch = await db.branch.findUnique({ where: { id: grant.branchId }, select: { name: true } });
  const agg = await db.asset.aggregate({
    where: { branchId: grant.branchId, isDisposed: false },
    _count: { _all: true },
    _sum: { purchaseValue: true },
  });

  await writeAuditLog({
    actor: session,
    action: "EQUIPMENT_VALUATION_VIEWED",
    entityType: "AssetValuation",
    entityId: grant.branchId,
    after: { scope: "BRANCH", branchId: grant.branchId },
  });

  return {
    scope: "BRANCH",
    branchId: grant.branchId,
    branchName: branch?.name,
    totalCount: agg._count._all,
    totalWorth: (agg._sum.purchaseValue ?? 0).toString(),
  };
}
