"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { AnnouncementScope, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canManageUsers, isHqRole, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { sendSms } from "@/lib/sms";

const announcementSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  scope: z.nativeEnum(AnnouncementScope),
  targetBranchId: z.string().optional(),
  targetRole: z.nativeEnum(Role).optional(),
});

export async function createAnnouncementAction(formData: FormData) {
  const session = await requireSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = announcementSchema.safeParse({ ...raw, targetBranchId: raw.targetBranchId || undefined, targetRole: raw.targetRole || undefined });
  if (!parsed.success) redirect(`/communications?error=${encodeURIComponent("Invalid input")}`);
  const data = parsed.data as z.infer<typeof announcementSchema>;

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
  redirect("/communications");
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
    where: { dateOfBirth: { not: null }, phone: { not: null } },
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
        create: upcoming.map((m) => ({ memberId: m.id, phone: m.phone! })),
      },
    },
  });

  await writeAuditLog({ actor: session, action: "SMS_CAMPAIGN_DRAFTED", entityType: "SmsCampaign", entityId: campaign.id, after: { recipients: upcoming.length } });
  redirect("/communications");
}

export async function approveSendCampaignAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session) && !isHqRole(session.role)) throw new ForbiddenError("Only Headquarters can confirm an SMS send.");

  const campaignId = String(formData.get("campaignId"));
  const campaign = await db.smsCampaign.findUnique({ where: { id: campaignId }, include: { recipients: true } });
  if (!campaign) redirect("/communications");

  for (const recipient of campaign!.recipients) {
    const result = await sendSms(recipient.phone, campaign!.draftMessage);
    await db.smsRecipient.update({ where: { id: recipient.id }, data: { status: result.ok ? "SENT" : "FAILED" } });
  }

  await db.smsCampaign.update({ where: { id: campaignId }, data: { status: "SENT", reviewedById: session.userId, sentAt: new Date() } });
  await writeAuditLog({ actor: session, action: "SMS_CAMPAIGN_SENT", entityType: "SmsCampaign", entityId: campaignId });

  redirect("/communications");
}
