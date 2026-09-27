import "server-only";
import { Role } from "@prisma/client";
import type { SessionPayload } from "./auth";

/**
 * Central permission model. Every module's data-access functions should route
 * through here rather than re-implementing role checks inline — the PRD is
 * explicit (Section 3.3) that access control must be enforced at the
 * system/permission layer, not just hidden in the UI.
 */

export const HQ_ROLES: Role[] = [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE];

export function isHqRole(role: Role) {
  return HQ_ROLES.includes(role);
}

/** Can this session see consolidated, church-wide data (subject to per-module sensitivity rules)? */
export function hasChurchWideVisibility(session: SessionPayload) {
  return isHqRole(session.role);
}

/** Can this session view/act on data scoped to a specific branch? */
export function canAccessBranch(session: SessionPayload, branchId: string) {
  if (isHqRole(session.role)) return true;
  return session.branchId === branchId;
}

/**
 * Restricted Equipment Valuation (PRD Section 3.3 / FR-12).
 *
 * - GENERAL_OVERSEER: church-wide total count + worth across all branches.
 * - BRANCH_PASTOR: total count + worth for their OWN branch only.
 * - Everyone else: no access, full stop — this is enforced here, not by
 *   hiding a UI element, so a direct API/query call from any other role
 *   must be rejected before it reaches the aggregate.
 */
export type EquipmentValuationScope =
  | { scope: "CHURCH_WIDE" }
  | { scope: "BRANCH"; branchId: string };

export function getEquipmentValuationScope(session: SessionPayload): EquipmentValuationScope | null {
  if (session.role === Role.GENERAL_OVERSEER) return { scope: "CHURCH_WIDE" };
  if (session.role === Role.BRANCH_PASTOR && session.branchId) {
    return { scope: "BRANCH", branchId: session.branchId };
  }
  return null;
}

export function canViewEquipmentValuation(session: SessionPayload) {
  return getEquipmentValuationScope(session) !== null;
}

/** Finance record visibility mirrors branch scoping, plus HQ finance/overseer roles. */
export function canAccessFinance(session: SessionPayload, branchId: string) {
  if (session.role === Role.GENERAL_OVERSEER || session.role === Role.HQ_FINANCE || session.role === Role.HQ_ADMIN) {
    return true;
  }
  if (session.role === Role.BRANCH_PASTOR || session.role === Role.FINANCE_OFFICER) {
    return session.branchId === branchId;
  }
  return false;
}

export function canManageUsers(session: SessionPayload) {
  return session.role === Role.GENERAL_OVERSEER || session.role === Role.HQ_ADMIN;
}

export function canApproveRequests(session: SessionPayload) {
  return isHqRole(session.role);
}

export function canManageBranch(session: SessionPayload, branchId: string) {
  if (isHqRole(session.role)) return true;
  return (
    (session.role === Role.BRANCH_PASTOR || session.role === Role.BRANCH_ADMIN) &&
    session.branchId === branchId
  );
}

/** Basic info needed to reason about access to another user's pastoral/leadership profile. */
export type ProfileTarget = { id: string; role: Role; branchId: string | null };

/** HQ sees everyone; branch leadership can view their own branch's people; anyone can view their own profile. */
export function canViewPastoralProfile(session: SessionPayload, target: ProfileTarget) {
  if (isHqRole(session.role)) return true;
  if (session.userId === target.id) return true;
  return (
    (session.role === Role.BRANCH_PASTOR || session.role === Role.BRANCH_ADMIN) &&
    session.branchId === target.branchId
  );
}

/**
 * Who can manage (add appointments/trainings, edit rank) a pastoral profile.
 * Per the PRD: Headquarters monitors pastors AND leaders; a branch's own
 * leadership only monitors leaders/workers in their own branch — a branch
 * pastor can't edit another pastor's record, only their own bio (see
 * canEditOwnBio) and their branch's leaders/workers.
 */
export function canManagePastoralProfile(session: SessionPayload, target: ProfileTarget) {
  if (isHqRole(session.role)) return true;
  if (target.role === Role.BRANCH_PASTOR || target.role === Role.GENERAL_OVERSEER) return false;
  return (
    (session.role === Role.BRANCH_PASTOR || session.role === Role.BRANCH_ADMIN) && session.branchId === target.branchId
  );
}

/** Anyone can edit their own bio/qualifications, even if they can't manage their own record otherwise. */
export function canEditOwnBio(session: SessionPayload, targetUserId: string) {
  return session.userId === targetUserId;
}

/** Salary is treated as sensitive finance data — HQ or the person themselves only. */
export function canViewSalary(session: SessionPayload, targetUserId: string) {
  return isHqRole(session.role) || session.userId === targetUserId;
}

/** Branding, role-permission matrix, and per-user module grants — Headquarters admins only. */
export function canManageSettings(session: SessionPayload) {
  return isHqRole(session.role) && (session.role === Role.GENERAL_OVERSEER || session.role === Role.HQ_ADMIN);
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
