import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, isHqRole } from "@/lib/rbac";
import { generateBirthdayCampaignAction, approveSendCampaignAction } from "./actions";
import { CreateAnnouncementModal } from "./create-announcement-modal";
import { EditCampaignMessageModal } from "./edit-campaign-message-modal";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function CommunicationsPage() {
  const session = await requireSession();
  const canManage = canManageUsers(session) || isHqRole(session.role);

  const [announcements, campaigns] = await Promise.all([
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    canManage
      ? db.smsCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { recipients: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Communications</h1>
        <p className="text-sm text-slate-500">Announcements and targeted SMS/email — every send needs manual confirmation.</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Birthday messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Drafts a message for members with a birthday in the next 7 days. Sends by SMS (Twilio) if the member
                has a phone number and/or by email (Resend) if they have an email — nothing goes out until reviewed.
              </p>
              <form action={generateBirthdayCampaignAction}>
                <Button type="submit" variant="secondary">
                  Draft this week&apos;s birthday messages
                </Button>
              </form>
            </div>
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {c.purpose} campaign — {c.recipients.length} recipient{c.recipients.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-slate-500">&quot;{c.draftMessage}&quot;</p>
                  <p className="text-xs text-slate-400">{formatDate(c.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={c.status === "SENT" ? "green" : "amber"}>{c.status.replace("_", " ")}</Badge>
                  {c.status === "PENDING_REVIEW" && (
                    <>
                      <EditCampaignMessageModal campaignId={c.id} draftMessage={c.draftMessage} />
                      <form action={approveSendCampaignAction}>
                        <input type="hidden" name="campaignId" value={c.id} />
                        <Button type="submit" size="sm">
                          Review &amp; send
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Announcements</h2>
        <CreateAnnouncementModal />
      </div>

      <Card>
        <CardContent className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{a.body}</p>
              <p className="text-xs text-slate-400">{formatDate(a.createdAt)}</p>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
