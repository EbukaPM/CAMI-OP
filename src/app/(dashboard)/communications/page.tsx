import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageUsers, isHqRole } from "@/lib/rbac";
import { createAnnouncementAction, generateBirthdayCampaignAction, approveSendCampaignAction } from "./actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { AnnouncementScope } from "@prisma/client";

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
        <p className="text-sm text-slate-500">Announcements and targeted SMS — every send needs manual confirmation.</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Birthday SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={generateBirthdayCampaignAction}>
              <Button type="submit" variant="secondary">
                Draft this week&apos;s birthday messages
              </Button>
            </form>
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
                    <form action={approveSendCampaignAction}>
                      <input type="hidden" name="campaignId" value={c.id} />
                      <Button type="submit" size="sm">
                        Review &amp; send
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Post an announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAnnouncementAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="title" required />
            </Field>
            <Field label="Scope">
              <Select name="scope" required defaultValue={AnnouncementScope.ALL}>
                <option value={AnnouncementScope.ALL}>Everyone</option>
                <option value={AnnouncementScope.BRANCH}>My branch</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Message">
                <Textarea name="body" rows={3} required />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Post announcement</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
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
