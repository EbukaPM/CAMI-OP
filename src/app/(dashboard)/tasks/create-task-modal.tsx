"use client";

import { Plus } from "lucide-react";
import { TaskPriority } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { createTaskAction } from "./actions";

export function CreateTaskModal({ users }: { users: { id: string; fullName: string }[] }) {
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> New task
        </Button>
      }
      title="Create a task"
      description="Pending → In Progress → Submitted → Reviewed → Completed."
      action={createTaskAction}
      submitLabel="Create task"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
    </ModalForm>
  );
}
