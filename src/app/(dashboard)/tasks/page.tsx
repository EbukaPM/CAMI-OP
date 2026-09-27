import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveHq } from "@/lib/rbac";
import { updateTaskStatusAction } from "./actions";
import { CreateTaskModal } from "./create-task-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { pageSkipTake } from "@/lib/pagination";
import { Badge, Button, Card, CardContent, Field } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";

const STATUS_FLOW: TaskStatus[] = ["PENDING", "IN_PROGRESS", "SUBMITTED", "REVIEWED", "COMPLETED"];
const STATUS_COLOR: Record<string, "slate" | "green" | "amber" | "blue"> = {
  PENDING: "slate",
  IN_PROGRESS: "blue",
  SUBMITTED: "amber",
  REVIEWED: "amber",
  COMPLETED: "green",
};

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const hq = effectiveHq(session);

  const statusFilter = sp.status && sp.status in TaskStatus ? (sp.status as TaskStatus) : undefined;
  const where = {
    ...(hq ? {} : { OR: [{ assignedToUserId: session.userId }, { assignedToBranchId: session.branchId ?? "__none__" }, { createdById: session.userId }] }),
    ...(statusFilter ? { status: statusFilter } : {}),
  };
  const { page, skip, take } = pageSkipTake(sp.page);

  const [users, tasks, totalCount] = await Promise.all([
    db.user.findMany({
      where: session.branchId ? { branchId: session.branchId } : hq ? {} : { id: "__none__" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { assignedTo: { select: { fullName: true } }, createdBy: { select: { fullName: true } } },
    }),
    db.task.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Pending → In Progress → Submitted → Reviewed → Completed."
        actions={!session.isViewOnly ? <CreateTaskModal users={users} /> : undefined}
      />

      <div className="w-48">
        <Field label="Status">
          <AutoSubmitSelect paramName="status" defaultValue={sp.status ?? ""}>
            <option value="">All statuses</option>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </AutoSubmitSelect>
        </Field>
      </div>

      <div className="space-y-3">
        {tasks.map((t) => {
          const nextIndex = STATUS_FLOW.indexOf(t.status) + 1;
          const nextStatus = STATUS_FLOW[nextIndex];
          const canAdvance = !session.isViewOnly && (t.assignedToUserId === session.userId || t.createdById === session.userId);

          return (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.assignedTo?.fullName ?? "Branch-wide"} · due {formatDate(t.dueDate)} · by {t.createdBy.fullName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={STATUS_COLOR[t.status]}>{t.status.replace("_", " ")}</Badge>
                  {canAdvance && nextStatus && (
                    <form action={updateTaskStatusAction}>
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="status" value={nextStatus} />
                      <Button type="submit" size="sm" variant="secondary">
                        Mark {nextStatus.replace("_", " ").toLowerCase()}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks match this filter.</p>}
      </div>
      <Card>
        <Pagination page={page} pageSize={take} totalCount={totalCount} basePath="/tasks" searchParams={sp} />
      </Card>
    </div>
  );
}
