import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  Church,
  Wallet,
  ClipboardCheck,
  FileText,
  Boxes,
  ListChecks,
  MessagesSquare,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[] };

// roles omitted = visible to everyone with a session
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/branches",
    label: "Branches",
    icon: Building2,
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE],
  },
  { href: "/users", label: "Users & Roles", icon: ShieldCheck, roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN] },
  {
    href: "/members",
    label: "Members",
    icon: Users,
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.BRANCH_PASTOR, Role.BRANCH_ADMIN, Role.MINISTRY_LEADER],
  },
  {
    href: "/pastoral",
    label: "Pastoral & Leadership",
    icon: Church,
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.BRANCH_PASTOR],
  },
  {
    href: "/finance",
    label: "Finance & Giving",
    icon: Wallet,
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE, Role.BRANCH_PASTOR, Role.FINANCE_OFFICER],
  },
  { href: "/requests", label: "Requests & Approvals", icon: ClipboardCheck },
  { href: "/documents", label: "Documents & Memos", icon: FileText },
  {
    href: "/equipment",
    label: "Equipment & Assets",
    icon: Boxes,
    roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.BRANCH_PASTOR, Role.BRANCH_ADMIN, Role.FINANCE_OFFICER],
  },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/communications", label: "Communications", icon: MessagesSquare },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, roles: [Role.GENERAL_OVERSEER, Role.HQ_ADMIN] },
];

export function visibleNavItems(role: Role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
