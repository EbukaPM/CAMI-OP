import "server-only";
import { cookies } from "next/headers";

// When an HQ user clicks into a branch's portal, we remember which branch
// via a short-lived cookie rather than a query param — it needs to follow
// them across every module page (members, finance, tasks, ...), not just
// the one they clicked from.
const VIEW_BRANCH_COOKIE = "cami_view_branch";

export async function getViewingBranchId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VIEW_BRANCH_COOKIE)?.value ?? null;
}

export async function setViewingBranch(branchId: string) {
  const store = await cookies();
  store.set(VIEW_BRANCH_COOKIE, branchId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearViewingBranch() {
  const store = await cookies();
  store.delete(VIEW_BRANCH_COOKIE);
}
