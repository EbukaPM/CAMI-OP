"use client";

import { Plus } from "lucide-react";
import { AppointmentType } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { addAppointmentAction } from "../actions";

const TYPE_LABELS: Record<AppointmentType, string> = {
  POSTING: "Posting",
  PROMOTION: "Promotion",
  TRAINING: "Training attended",
  APPOINTMENT: "Other appointment",
};

export function AddAppointmentModal({ userId }: { userId: string }) {
  return (
    <ModalForm
      trigger={
        <Button size="sm" variant="secondary">
          <Plus size={13} /> Add to history
        </Button>
      }
      title="Add to career history"
      action={addAppointmentAction}
      submitLabel="Add"
    >
      <input type="hidden" name="userId" value={userId} />
      <Field label="Type">
        <Select name="type" required defaultValue={AppointmentType.TRAINING}>
          {Object.values(AppointmentType).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title">
        <Input name="positionTitle" required placeholder="Leadership Summit 2026, Posted as Branch Pastor..." />
      </Field>
      <Field label="Date">
        <Input name="startDate" type="date" required />
      </Field>
      <Field label="End date (optional)">
        <Input name="endDate" type="date" />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" rows={2} />
      </Field>
    </ModalForm>
  );
}
