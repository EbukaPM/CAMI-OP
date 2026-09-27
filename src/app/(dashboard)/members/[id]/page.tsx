import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole, ForbiddenError } from "@/lib/rbac";
import { EditMemberModal } from "./edit-member-modal";
import { AddFollowUpModal } from "./add-followup-modal";
import { AddMinistryModal } from "./add-ministry-modal";
import { closeFollowUpAction } from "../actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      household: { include: { members: { select: { id: true, firstName: true, lastName: true } } } },
      ministryInvolvements: { include: { ministry: { select: { name: true } } } },
      followUps: { orderBy: { createdAt: "desc" } },
      attendanceRecords: { include: { service: true }, orderBy: { service: { date: "desc" } }, take: 20 },
    },
  });
  if (!member) notFound();

  if (!isHqRole(session.role) && session.branchId !== member.branchId) {
    throw new ForbiddenError("You can only view members in your own branch.");
  }

  const ministries = await db.ministry.findMany({ where: { OR: [{ branchId: member.branchId }, { branchId: null }] }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {member.photoFileAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${member.photoFileAssetId}`} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-500 dark:bg-slate-800">
              {member.firstName[0]}
              {member.lastName[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {member.firstName} {member.lastName}
            </h1>
            <p className="text-sm text-slate-500">{member.branch.name}</p>
          </div>
          <Badge color={member.membershipStatus === "ACTIVE" ? "green" : "slate"}>{member.membershipStatus}</Badge>
        </div>
        <EditMemberModal member={member} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Phone:</span> {member.phone ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Email:</span> {member.email ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Date of birth:</span> {formatDate(member.dateOfBirth)}
            </p>
            <p>
              <span className="text-slate-500">Gender:</span> {member.gender ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Occupation:</span> {member.occupation ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Address:</span> {member.address ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Joined:</span> {formatDate(member.joinedAt ?? member.createdAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spiritual history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Baptism date:</span> {formatDate(member.baptismDate)}
            </p>
            <p>
              <span className="text-slate-500">Foundation class:</span>{" "}
              <Badge color={member.foundationClassDone ? "green" : "slate"}>{member.foundationClassDone ? "Completed" : "Not yet"}</Badge>
            </p>
            {member.attendanceNotes && (
              <p>
                <span className="text-slate-500">Attendance notes:</span> {member.attendanceNotes}
              </p>
            )}
            {member.notes && (
              <p>
                <span className="text-slate-500">Notes:</span> {member.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Family / household</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {member.household ? (
              <>
                <p className="font-medium text-slate-900 dark:text-slate-100">{member.household.name}</p>
                <ul className="mt-2 space-y-1 text-slate-500">
                  {member.household.members
                    .filter((m) => m.id !== member.id)
                    .map((m) => (
                      <li key={m.id}>
                        {m.firstName} {m.lastName}
                      </li>
                    ))}
                  {member.household.members.length <= 1 && <li>No other family members linked yet.</li>}
                </ul>
              </>
            ) : (
              <p className="text-slate-500">No household linked — edit this member to add one.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Ministry involvement</CardTitle>
            <AddMinistryModal memberId={member.id} ministries={ministries} />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {member.ministryInvolvements.map((mi) => (
              <div key={mi.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                <span>{mi.ministry.name}</span>
                {mi.roleTitle && <Badge color="blue">{mi.roleTitle}</Badge>}
              </div>
            ))}
            {member.ministryInvolvements.length === 0 && <p className="text-slate-500">Not involved in any ministry yet.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Pastoral follow-ups</CardTitle>
            <AddFollowUpModal memberId={member.id} />
          </CardHeader>
          <CardContent className="space-y-2">
            {member.followUps.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-slate-800">
                <div>
                  <p className="text-slate-900 dark:text-slate-100">{f.note}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(f.createdAt)}
                    {f.dueDate ? ` · due ${formatDate(f.dueDate)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge color={f.status === "CLOSED" ? "green" : "amber"}>{f.status}</Badge>
                  {f.status !== "CLOSED" && (
                    <form action={closeFollowUpAction}>
                      <input type="hidden" name="followUpId" value={f.id} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Mark closed
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
            {member.followUps.length === 0 && <p className="text-sm text-slate-500">No follow-ups recorded.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance history</CardTitle>
          </CardHeader>
          <CardContent>
            {member.attendanceRecords.length === 0 ? (
              <p className="text-sm text-slate-500">No per-service attendance recorded for this member yet.</p>
            ) : (
              <div className="space-y-1 text-sm">
                {member.attendanceRecords.map((a) => (
                  <p key={a.id}>
                    {formatDate(a.service.date)} — {a.service.type} — {a.present ? "Present" : "Absent"}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
