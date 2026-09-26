"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  assignedToUserId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.nativeEnum(TaskPriority),
});

export async function createTaskAction(formData: FormData) {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = taskSchema.safeParse({ ...raw, assignedToUserId: raw.assignedToUserId || undefined });
  if (!parsed.success) {
    redirect(`/tasks?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const data = parsed.data as z.infer<typeof taskSchema>;

  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      createdById: session.userId,
      assignedToUserId: data.assignedToUserId || null,
      assignedToBranchId: data.assignedToUserId ? null : session.branchId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
    },
  });

  await writeAuditLog({ actor: session, action: "TASK_CREATED", entityType: "Task", entityId: task.id, after: task });
  redirect("/tasks");
}

export async function updateTaskStatusAction(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId"));
  const status = formData.get("status") as TaskStatus;

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) redirect("/tasks");

  const isOwner = task!.assignedToUserId === session.userId || task!.createdById === session.userId;
  if (!isOwner) throw new ForbiddenError("Only the assignee or creator can update this task.");

  await db.task.update({ where: { id: taskId }, data: { status } });
  await writeAuditLog({
    actor: session,
    action: "TASK_STATUS_CHANGED",
    entityType: "Task",
    entityId: taskId,
    before: { status: task!.status },
    after: { status },
  });

  redirect("/tasks");
}
