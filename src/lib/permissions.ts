import "server-only";
import { db } from "./db";
import { NAV_ITEMS } from "./nav";
import type { SessionPayload } from "./auth";

/**
 * Which sidebar modules a role/user can see. This governs navigation/page
 * visibility only — it is a convenience layer for HQ to tailor the sidebar
 * per role or per user, NOT a replacement for the hard security rules in
 * lib/rbac.ts (branch scoping, the restricted equipment valuation, etc.),
 * which stay hardcoded and are not user-configurable.
 *
 * Precedence: explicit per-user grant > ModulePermission override for the
 * role > the hardcoded default in nav.tsx.
 */
export async function getVisibleModules(session: SessionPayload): Promise<Set<string>> {
  const [rolePerms, userGrants] = await Promise.all([
    db.modulePermission.findMany({ where: { role: session.role } }),
    db.userModuleGrant.findMany({ where: { userId: session.userId } }),
  ]);

  const modules = new Set<string>();
  for (const item of NAV_ITEMS) {
    const moduleKey = item.href.slice(1) || "dashboard";
    const defaultAllowed = !item.roles || item.roles.includes(session.role);
    const roleOverride = rolePerms.find((p) => p.module === moduleKey);
    let allowed = roleOverride ? roleOverride.allowed : defaultAllowed;
    const userGrant = userGrants.find((g) => g.module === moduleKey);
    if (userGrant) allowed = userGrant.allowed;
    if (allowed) modules.add(moduleKey);
  }
  return modules;
}

export const ALL_MODULES = NAV_ITEMS.map((i) => ({ key: i.href.slice(1) || "dashboard", label: i.label }));
