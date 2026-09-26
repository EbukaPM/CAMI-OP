"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await writeAuditLog({ actor: session, action: "USER_LOGOUT", entityType: "User", entityId: session.userId });
  }
  await clearSessionCookie();
  redirect("/login");
}
