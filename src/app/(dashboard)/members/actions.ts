"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { MembershipStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { canManageBranch, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { storeUploadedFile, getOptionalFile, UploadError } from "@/lib/uploads";
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

const updateMemberSchema = z.object({
  memberId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  householdName: z.string().optional(),
  membershipStatus: z.nativeEnum(MembershipStatus),
  baptismDate: z.string().optional(),
  foundationClassDone: z.string().optional(),
  attendanceNotes: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = updateMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const member = await db.member.findUnique({ where: { id: data.memberId } });
  if (!member) return { error: "Member not found." };
  if (!canManageBranch(session, member.branchId)) {
    throw new ForbiddenError("You can only edit members in your own branch.");
  }

  let householdId = member.householdId;
  const householdName = data.householdName?.trim();
  if (householdName) {
    const existing = await db.household.findFirst({ where: { branchId: member.branchId, name: householdName } });
    const household = existing ?? (await db.household.create({ data: { branchId: member.branchId, name: householdName } }));
    householdId = household.id;
  }

  let photoFileAssetId = member.photoFileAssetId;
  const photo = getOptionalFile(formData, "photo");
  if (photo) {
    try {
      const stored = await storeUploadedFile(photo, session.userId);
      photoFileAssetId = stored?.id ?? photoFileAssetId;
    } catch (err) {
      if (err instanceof UploadError) return { error: err.message };
      throw err;
    }
  }

  await db.member.update({
    where: { id: data.memberId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      occupation: data.occupation || null,
      address: data.address || null,
      householdId,
      photoFileAssetId,
      membershipStatus: data.membershipStatus,
      baptismDate: data.baptismDate ? new Date(data.baptismDate) : null,
      foundationClassDone: data.foundationClassDone === "on",
      attendanceNotes: data.attendanceNotes || null,
      notes: data.notes || null,
    },
  });

  await writeAuditLog({ actor: session, action: "MEMBER_UPDATED", entityType: "Member", entityId: data.memberId });
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/members");
  return { success: true };
}

const followUpSchema = z.object({
  memberId: z.string().min(1),
  note: z.string().min(2),
  dueDate: z.string().optional(),
});

export async function addFollowUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = followUpSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input" };

  const member = await db.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member) return { error: "Member not found." };
  if (!canManageBranch(session, member.branchId)) throw new ForbiddenError("You can only follow up with members in your own branch.");

  await db.followUpRecord.create({
    data: {
      memberId: parsed.data.memberId,
      note: parsed.data.note,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assignedToId: session.userId,
    },
  });

  await writeAuditLog({ actor: session, action: "MEMBER_FOLLOWUP_ADDED", entityType: "Member", entityId: parsed.data.memberId });
  revalidatePath(`/members/${parsed.data.memberId}`);
  return { success: true };
}

export async function closeFollowUpAction(formData: FormData) {
  const session = await requireSession();
  const followUpId = String(formData.get("followUpId"));
  const memberId = String(formData.get("memberId"));

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (member && !canManageBranch(session, member.branchId)) throw new ForbiddenError();

  await db.followUpRecord.update({ where: { id: followUpId }, data: { status: "CLOSED" } });
  await writeAuditLog({ actor: session, action: "MEMBER_FOLLOWUP_CLOSED", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

const ministrySchema = z.object({
  memberId: z.string().min(1),
  ministryId: z.string().min(1),
  roleTitle: z.string().optional(),
});

export async function addMinistryInvolvementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = ministrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input" };

  const member = await db.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member) return { error: "Member not found." };
  if (!canManageBranch(session, member.branchId)) throw new ForbiddenError("You can only manage members in your own branch.");

  await db.ministryInvolvement.create({
    data: { memberId: parsed.data.memberId, ministryId: parsed.data.ministryId, roleTitle: parsed.data.roleTitle || null },
  });

  await writeAuditLog({ actor: session, action: "MEMBER_MINISTRY_ADDED", entityType: "Member", entityId: parsed.data.memberId });
  revalidatePath(`/members/${parsed.data.memberId}`);
  return { success: true };
}
