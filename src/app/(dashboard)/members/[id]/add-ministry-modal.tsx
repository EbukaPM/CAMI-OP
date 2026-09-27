"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { addMinistryInvolvementAction } from "../actions";

export function AddMinistryModal({ memberId, ministries }: { memberId: string; ministries: { id: string; name: string }[] }) {
  return (
    <ModalForm
      trigger={
        <Button size="sm" variant="secondary">
          <Plus size={13} /> Add ministry
        </Button>
      }
      title="Add ministry involvement"
      action={addMinistryInvolvementAction}
      submitLabel="Add"
    >
      <input type="hidden" name="memberId" value={memberId} />
      <Field label="Ministry">
        <Select name="ministryId" required defaultValue="">
          <option value="" disabled>
            Select ministry
          </option>
          {ministries.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Role (optional)">
        <Input name="roleTitle" placeholder="Usher, Choir member, Coordinator..." />
      </Field>
    </ModalForm>
  );
}
