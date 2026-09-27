"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Role, AppointmentType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { isHqRole, canManagePastoralProfile, canEditOwnBio, canManageUsers, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "@/lib/action-state";

async function loadTarget(userId: string) {
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, branchId: true } });
  if (!target) throw new ForbiddenError("User not found.");
  return target;
}

const assignmentSchema = z.object({
  pastorId: z.string().min(1),
  branchId: z.string().min(1),
  date: z.string().min(1),
  eventOrService: z.string().optional(),
});

export async function createPreachingAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can schedule preaching assignments.");

  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input" };
  const data = parsed.data;

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
  revalidatePath("/pastoral");
  return { success: true };
}

const profileSchema = z.object({
  userId: z.string().min(1),
  qualifications: z.string().optional(),
  bio: z.string().optional(),
  ordinationDate: z.string().optional(),
  currentRank: z.string().optional(),
  salary: z.coerce.number().nonnegative().optional().or(z.literal("")),
});

/**
 * Anyone can update their own bio/qualifications. Rank and salary — the
 * "growth" fields — are only ever written when the caller can manage this
 * profile (HQ, or the person's own branch leadership for a leader/worker),
 * regardless of what the form submitted, so a self-edit can never bump your
 * own rank or salary.
 */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input" };
  const data = parsed.data;

  const target = await loadTarget(data.userId);
  const isSelf = canEditOwnBio(session, target.id);
  const canManage = canManagePastoralProfile(session, target);
  if (!isSelf && !canManage) throw new ForbiddenError("You don't have permission to edit this profile.");

  const growthFields =
    canManage && isHqRole(session.role)
      ? {
          currentRank: data.currentRank || null,
          salary: data.salary === "" || data.salary === undefined ? null : data.salary,
        }
      : {};

  await db.pastorProfile.upsert({
    where: { userId: data.userId },
    update: {
      qualifications: data.qualifications || null,
      bio: data.bio || null,
      ordinationDate: data.ordinationDate ? new Date(data.ordinationDate) : null,
      ...growthFields,
    },
    create: {
      userId: data.userId,
      qualifications: data.qualifications || null,
      bio: data.bio || null,
      ordinationDate: data.ordinationDate ? new Date(data.ordinationDate) : null,
      ...growthFields,
    },
  });

  await writeAuditLog({ actor: session, action: "PASTORAL_PROFILE_UPDATED", entityType: "User", entityId: data.userId });
  revalidatePath(`/pastoral/${data.userId}`);
  return { success: true };
}

const appointmentSchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(AppointmentType),
  positionTitle: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function addAppointmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = appointmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const target = await loadTarget(data.userId);
  if (!canManagePastoralProfile(session, target)) throw new ForbiddenError("You don't have permission to update this person's record.");

  await db.appointment.create({
    data: {
      userId: data.userId,
      branchId: target.branchId,
      type: data.type,
      positionTitle: data.positionTitle,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes || null,
    },
  });

  await writeAuditLog({ actor: session, action: "APPOINTMENT_ADDED", entityType: "User", entityId: data.userId, after: { type: data.type, positionTitle: data.positionTitle } });
  revalidatePath(`/pastoral/${data.userId}`);
  return { success: true };
}

const roleChangeSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role),
});

const HQ_ONLY_ROLES: Role[] = [Role.GENERAL_OVERSEER, Role.HQ_ADMIN, Role.HQ_FINANCE];

/** Promotes/changes a user's role — e.g. ordaining a Ministry Leader to Branch Pastor. */
export async function changeRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new ForbiddenError("Only Headquarters administrators can change roles.");

  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input" };

  const target = await loadTarget(parsed.data.userId);
  const before = target.role;

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role, branchId: HQ_ONLY_ROLES.includes(parsed.data.role) ? null : target.branchId },
  });

  await writeAuditLog({
    actor: session,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: parsed.data.userId,
    before: { role: before },
    after: { role: parsed.data.role },
  });

  revalidatePath(`/pastoral/${parsed.data.userId}`);
  revalidatePath("/pastoral");
  return { success: true };
}
