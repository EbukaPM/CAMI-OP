"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AnnouncementScope, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWriteSession as requireSession } from "@/lib/auth";
import { canManageUsers, isHqRole, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import type { ActionState } from "@/lib/action-state";

const announcementSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  scope: z.nativeEnum(AnnouncementScope),
  targetBranchId: z.string().optional(),
  targetRole: z.nativeEnum(Role).optional(),
});

export async function createAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = announcementSchema.safeParse({ ...raw, targetBranchId: raw.targetBranchId || undefined, targetRole: raw.targetRole || undefined });
  if (!parsed.success) return { error: "Invalid input" };
  const data = parsed.data;

  const announcement = await db.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      scope: data.scope,
      targetBranchId: data.scope === "BRANCH" ? data.targetBranchId ?? session.branchId : null,
      targetRole: data.scope === "ROLE" ? data.targetRole ?? null : null,
      createdById: session.userId,
    },
  });

  await writeAuditLog({ actor: session, action: "ANNOUNCEMENT_CREATED", entityType: "Announcement", entityId: announcement.id });
  revalidatePath("/communications");
  return { success: true };
}

// Auto-identifies members with a birthday in the next 7 days, but the
// campaign sits as PENDING_REVIEW until a human approves the send — PRD
// FR-16/FR-17 require manual confirmation before any SMS goes out.
export async function generateBirthdayCampaignAction() {
  const session = await requireSession();
  if (!canManageUsers(session) && !isHqRole(session.role)) throw new ForbiddenError();

  const today = new Date();
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const members = await db.member.findMany({
    where: { dateOfBirth: { not: null }, OR: [{ phone: { not: null } }, { email: { not: null } }] },
  });

  const upcoming = members.filter((m) => {
    if (!m.dateOfBirth) return false;
    const bday = new Date(m.dateOfBirth);
    bday.setFullYear(today.getFullYear());
    if (bday < today) bday.setFullYear(today.getFullYear() + 1);
    return bday >= today && bday <= in7;
  });

  const campaign = await db.smsCampaign.create({
    data: {
      purpose: "BIRTHDAY",
      draftMessage: "Happy birthday from your CAMI Church family! We celebrate God's goodness in your life today. 🎉",
      status: "PENDING_REVIEW",
      recipients: {
        create: upcoming.map((m) => ({ memberId: m.id, phone: m.phone ?? "" })),
      },
    },
  });

  await writeAuditLog({ actor: session, action: "SMS_CAMPAIGN_DRAFTED", entityType: "SmsCampaign", entityId: campaign.id, after: { recipients: upcoming.length } });
  redirect("/communications");
}

const editMessageSchema = z.object({
  campaignId: z.string().min(1),
  draftMessage: z.string().min(2),
});

/** Lets HQ tweak the auto-drafted message before it ever goes out. */
export async function updateSmsCampaignMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!canManageUsers(session) && !isHqRole(session.role)) throw new ForbiddenError();

  const parsed = editMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input" };

  const campaign = await db.smsCampaign.findUnique({ where: { id: parsed.data.campaignId } });
  if (!campaign) return { error: "Campaign not found." };
  if (campaign.status !== "PENDING_REVIEW") return { error: "This campaign has already been sent." };

  await db.smsCampaign.update({ where: { id: campaign.id }, data: { draftMessage: parsed.data.draftMessage } });
  await writeAuditLog({ actor: session, action: "SMS_CAMPAIGN_MESSAGE_EDITED", entityType: "SmsCampaign", entityId: campaign.id });

  revalidatePath("/communications");
  return { success: true };
}

export async function approveSendCampaignAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session) && !isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can confirm an SMS send.");

  const campaignId = String(formData.get("campaignId"));
  const campaign = await db.smsCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: { include: { member: { select: { email: true } } } } },
  });
  if (!campaign) redirect("/communications");

  for (const recipient of campaign!.recipients) {
    // SMS if there's a phone number, email as well/instead if the member has
    // one — both channels are best-effort and simulated/logged when no
    // Twilio/Resend credentials are configured (see lib/sms.ts, lib/email.ts).
    let delivered = false;
    if (recipient.phone) {
      const smsResult = await sendSms(recipient.phone, campaign!.draftMessage);
      delivered = delivered || smsResult.ok;
    }
    if (recipient.member.email) {
      const emailResult = await sendEmail(recipient.member.email, "A message from CAMI Church", campaign!.draftMessage);
      delivered = delivered || emailResult.ok;
    }
    await db.smsRecipient.update({ where: { id: recipient.id }, data: { status: delivered ? "SENT" : "FAILED" } });
  }

  await db.smsCampaign.update({ where: { id: campaignId }, data: { status: "SENT", reviewedById: session.userId, sentAt: new Date() } });
  await writeAuditLog({ actor: session, action: "SMS_CAMPAIGN_SENT", entityType: "SmsCampaign", entityId: campaignId });

  redirect("/communications");
}
