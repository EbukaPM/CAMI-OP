"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { isHqRole, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const assignmentSchema = z.object({
  pastorId: z.string().min(1),
  branchId: z.string().min(1),
  date: z.string().min(1),
  eventOrService: z.string().optional(),
});

export async function createPreachingAssignmentAction(formData: FormData) {
  const session = await requireSession();
  if (!isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can schedule preaching assignments.");

  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/pastoral?error=${encodeURIComponent("Invalid input")}`);
  const data = parsed.data as z.infer<typeof assignmentSchema>;

  const assignment = await db.preachingAssignment.create({
    data: {
      pastorId: data.pastorId,
      branchId: data.branchId,
      date: new Date(data.date),
      eventOrService: data.eventOrService || null,
      status: "NOTIFIED",
      notifiedAt: new Date(),
    },
  });

  await db.notification.create({
    data: {
      userId: data.pastorId,
      title: "New preaching assignment",
      body: `You've been scheduled to minister at a branch on ${data.date}.`,
      entityType: "PreachingAssignment",
      entityId: assignment.id,
    },
  });

  await writeAuditLog({ actor: session, action: "PREACHING_ASSIGNMENT_CREATED", entityType: "PreachingAssignment", entityId: assignment.id });
  redirect("/pastoral");
}
