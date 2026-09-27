"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageBranch, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "@/lib/action-state";

const memberSchema = z.object({
  branchId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
});

export async function createMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  if (!canManageBranch(session, data.branchId)) {
    throw new ForbiddenError("You can only add members to your own branch.");
  }

  const member = await db.member.create({
    data: {
      branchId: data.branchId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      occupation: data.occupation || null,
    },
  });

  await writeAuditLog({
    actor: session,
    action: "MEMBER_CREATED",
    entityType: "Member",
    entityId: member.id,
    after: member,
  });

  revalidatePath("/members");
  return { success: true };
}
