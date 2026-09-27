"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { createPreachingAssignmentAction } from "./actions";

export function ScheduleAssignmentModal({
  pastors,
  branches,
}: {
  pastors: { id: string; fullName: string }[];
  branches: { id: string; name: string }[];
}) {
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> Schedule assignment
        </Button>
      }
      title="Schedule a preaching assignment"
      description="The pastor is notified immediately once scheduled."
      action={createPreachingAssignmentAction}
      submitLabel="Schedule & notify"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Pastor">
          <Select name="pastorId" required defaultValue="">
            <option value="" disabled>
              Select pastor
            </option>
            {pastors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch">
          <Select name="branchId" required defaultValue="">
            <option value="" disabled>
              Select branch
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required />
        </Field>
        <Field label="Event / service">
          <Input name="eventOrService" placeholder="Sunday Service, Anniversary..." />
        </Field>
      </div>
    </ModalForm>
  );
}
