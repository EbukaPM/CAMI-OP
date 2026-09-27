"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "@/lib/action-state";

const branchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  serviceSchedule: z.string().optional(),
});

export async function createBranchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can create branches.");

  const parsed = branchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const branch = await db.branch.create({ data: parsed.data });

  await writeAuditLog({
    actor: session,
    action: "BRANCH_CREATED",
    entityType: "Branch",
    entityId: branch.id,
    after: branch,
  });

  revalidatePath("/branches");
  return { success: true };
}
