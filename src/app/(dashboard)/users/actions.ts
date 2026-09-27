"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "@/lib/action-state";

const HQ_ONLY_ROLES: Role[] = [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE];

const userSchema = z
  .object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.nativeEnum(Role),
    branchId: z.string().optional(),
    password: z.string().min(8),
  })
  .refine((data) => HQ_ONLY_ROLES.includes(data.role) || !!data.branchId, {
    message: "Branch-scoped roles must be assigned to a branch.",
    path: ["branchId"],
  });

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can manage users.");

  const raw = Object.fromEntries(formData.entries());
  const parsed = userSchema.safeParse({ ...raw, branchId: raw.branchId || undefined });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const passwordHash = await hashPassword(data.password);
  const user = await db.user.create({
    data: {
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      role: data.role,
      branchId: HQ_ONLY_ROLES.includes(data.role) ? null : data.branchId ?? null,
      passwordHash,
    },
  });

  await writeAuditLog({
    actor: session,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, role: user.role, branchId: user.branchId },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function setUserActiveAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can manage users.");

  const userId = String(formData.get("userId"));
  const isActive = formData.get("isActive") === "true";

  const before = await db.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  await db.user.update({ where: { id: userId }, data: { isActive } });

  await writeAuditLog({
    actor: session,
    action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: userId,
    before,
    after: { isActive },
  });

  redirect("/users");
}
