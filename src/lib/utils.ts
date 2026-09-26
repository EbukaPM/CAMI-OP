import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "NGN") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(date));
}

export const ROLE_LABELS: Record<string, string> = {
  GENERAL_OVERSEER: "General Overseer",
  HQ_ADMIN: "HQ Administrator",
  HQ_FINANCE: "HQ Finance Officer",
  BRANCH_PASTOR: "Branch Pastor",
  BRANCH_ADMIN: "Branch Administrator",
  FINANCE_OFFICER: "Finance Officer",
  MINISTRY_LEADER: "Ministry Leader",
  WORKER: "Worker",
  MEMBER: "Member",
};
