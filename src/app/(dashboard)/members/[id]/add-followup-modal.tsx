"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { addFollowUpAction } from "../actions";

export function AddFollowUpModal({ memberId }: { memberId: string }) {
  return (
    <ModalForm
      trigger={
        <Button size="sm" variant="secondary">
          <Plus size={13} /> Add follow-up
        </Button>
      }
      title="Add a pastoral follow-up"
      action={addFollowUpAction}
      submitLabel="Add follow-up"
    >
      <input type="hidden" name="memberId" value={memberId} />
      <Field label="Note">
        <Textarea name="note" rows={3} required />
      </Field>
      <Field label="Due date (optional)">
        <Input name="dueDate" type="date" />
      </Field>
    </ModalForm>
  );
}
