"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageUsers, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

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

export async function createBranchAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can create branches.");

  const parsed = branchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(`/branches?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const branch = await db.branch.create({ data: parsed.data as z.infer<typeof branchSchema> });

  await writeAuditLog({
    actor: session,
    action: "BRANCH_CREATED",
    entityType: "Branch",
    entityId: branch.id,
    after: branch,
  });

  redirect("/branches");
}
