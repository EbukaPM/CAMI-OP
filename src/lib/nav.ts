import { Role } from "@prisma/client";

export type NavItem = { href: string; label: string; roles?: Role[] };

// roles omitted = visible to everyone with a session
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/branches", label: "Branches", roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE] },
  { href: "/users", label: "Users & Roles", roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN] },
  {
    href: "/members",
    label: "Members",
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.BRANCH_PASTOR, Role.BRANCH_ADMIN, Role.MINISTRY_LEADER],
  },
  {
    href: "/pastoral",
    label: "Pastoral & Leadership",
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.BRANCH_PASTOR],
  },
  {
    href: "/finance",
    label: "Finance & Giving",
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE, Role.BRANCH_PASTOR, Role.FINANCE_OFFICER],
  },
  { href: "/requests", label: "Requests & Approvals" },
  { href: "/documents", label: "Documents & Memos" },
  {
    href: "/equipment",
    label: "Equipment & Assets",
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.BRANCH_PASTOR, Role.BRANCH_ADMIN, Role.FINANCE_OFFICER],
  },
  { href: "/tasks", label: "Tasks" },
  { href: "/communications", label: "Communications" },
  { href: "/audit-log", label: "Audit Log", roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN] },
];

export function visibleNavItems(role: Role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
