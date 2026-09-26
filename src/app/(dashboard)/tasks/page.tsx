import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isHqRole } from "@/lib/rbac";
import { createTaskAction, updateTaskStatusAction } from "./actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ErrorText, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { TaskPriority, TaskStatus } from "@prisma/client";

const STATUS_FLOW: TaskStatus[] = ["PENDING", "IN_PROGRESS", "SUBMITTED", "REVIEWED", "COMPLETED"];
const STATUS_COLOR: Record<string, "slate" | "green" | "amber" | "blue"> = {
  PENDING: "slate",
  IN_PROGRESS: "blue",
  SUBMITTED: "amber",
  REVIEWED: "amber",
  COMPLETED: "green",
};

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  const { error } = await searchParams;
  const hq = isHqRole(session.role);

  const [users, tasks] = await Promise.all([
    db.user.findMany({
      where: session.branchId ? { branchId: session.branchId } : hq ? {} : { id: "__none__" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.task.findMany({
      where: hq
        ? {}
        : { OR: [{ assignedToUserId: session.userId }, { assignedToBranchId: session.branchId ?? "__none__" }, { createdById: session.userId }] },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { fullName: true } }, createdBy: { select: { fullName: true } } },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tasks</h1>
        <p className="text-sm text-slate-500">Pending → In Progress → Submitted → Reviewed → Completed.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a task</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTaskAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="title" required />
            </Field>
            <Field label="Assign to">
              <Select name="assignedToUserId" defaultValue="">
                <option value="">— Whole branch —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due date">
              <Input name="dueDate" type="date" />
            </Field>
            <Field label="Priority">
              <Select name="priority" required defaultValue={TaskPriority.NORMAL}>
                {Object.values(TaskPriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea name="description" rows={2} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ErrorText>{error}</ErrorText>
              <Button type="submit">Create task</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {tasks.map((t) => {
          const nextIndex = STATUS_FLOW.indexOf(t.status) + 1;
          const nextStatus = STATUS_FLOW[nextIndex];
          const canAdvance = t.assignedToUserId === session.userId || t.createdById === session.userId;

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
        {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}
      </div>
    </div>
  );
}
