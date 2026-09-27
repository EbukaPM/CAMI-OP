import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewPastoralProfile, canManagePastoralProfile, canEditOwnBio, canViewSalary, canManageUsers, isHqRole, ForbiddenError } from "@/lib/rbac";
import { EditProfileModal } from "./edit-profile-modal";
import { AddAppointmentModal } from "./add-appointment-modal";
import { ChangeRoleModal } from "./change-role-modal";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { formatCurrency, formatDate, ROLE_LABELS } from "@/lib/utils";

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  POSTING: "Posting",
  PROMOTION: "Promotion",
  TRAINING: "Training",
  APPOINTMENT: "Appointment",
};

export default async function PastoralProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await requireSession();
  const { userId } = await params;

  const target = await db.user.findUnique({
    where: { id: userId },
    include: {
      branch: { select: { name: true } },
      pastorProfile: true,
      appointments: { orderBy: { startDate: "desc" } },
      preachingAssignments: { orderBy: { date: "desc" }, take: 10, include: { branch: { select: { name: true } } } },
    },
  });
  if (!target) notFound();

  if (!canViewPastoralProfile(session, target)) {
    throw new ForbiddenError("You don't have permission to view this profile.");
  }

  const canManage = canManagePastoralProfile(session, target);
  const canEditBio = canEditOwnBio(session, target.id);
  const canSeeSalary = canViewSalary(session, target.id);

  return (
    <div className="space-y-6">
      <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{target.fullName}</h1>
          <p className="text-sm text-slate-500">
            {ROLE_LABELS[target.role]} · {target.branch?.name ?? "Headquarters"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(canManage || canEditBio) && (
            <EditProfileModal
              userId={target.id}
              showGrowthFields={canManage && isHqRole(session.role)}
              profile={{
                qualifications: target.pastorProfile?.qualifications ?? null,
                bio: target.pastorProfile?.bio ?? null,
                ordinationDate: target.pastorProfile?.ordinationDate ?? null,
                currentRank: target.pastorProfile?.currentRank ?? null,
                salary: target.pastorProfile?.salary?.toString() ?? null,
              }}
            />
          )}
          {canManageUsers(session) && !session.isViewOnly && <ChangeRoleModal userId={target.id} currentRole={target.role} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Current rank:</span> {target.pastorProfile?.currentRank ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Qualifications:</span> {target.pastorProfile?.qualifications ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Ordination date:</span> {formatDate(target.pastorProfile?.ordinationDate)}
            </p>
            {target.pastorProfile?.bio && (
              <p>
                <span className="text-slate-500">Bio:</span> {target.pastorProfile.bio}
              </p>
            )}
            {canSeeSalary && (
              <p>
                <span className="text-slate-500">Salary:</span>{" "}
                {target.pastorProfile?.salary ? formatCurrency(target.pastorProfile.salary.toString()) : "Not recorded"}
                <span className="ml-2 text-xs text-slate-400">(restricted)</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent preaching assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {target.preachingAssignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                <span>
                  {a.branch.name} — {a.eventOrService ?? "Service"}
                </span>
                <span className="text-slate-500">{formatDate(a.date)}</span>
              </div>
            ))}
            {target.preachingAssignments.length === 0 && <p className="text-slate-500">No preaching assignments yet.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Career history — postings, promotions, trainings</CardTitle>
            {canManage && <AddAppointmentModal userId={target.id} />}
          </CardHeader>
          <CardContent className="space-y-2">
            {target.appointments.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-slate-800">
                <div>
                  <p className="text-slate-900 dark:text-slate-100">{a.positionTitle}</p>
                  {a.notes && <p className="text-xs text-slate-500">{a.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge color="blue">{APPOINTMENT_TYPE_LABELS[a.type]}</Badge>
                  <span className="text-xs text-slate-500">{formatDate(a.startDate)}</span>
                </div>
              </div>
            ))}
            {target.appointments.length === 0 && <p className="text-sm text-slate-500">No career history recorded yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
