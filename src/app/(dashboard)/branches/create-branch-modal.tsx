"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input } from "@/components/ui/primitives";
import { createBranchAction } from "./actions";

export function CreateBranchModal() {
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> New branch
        </Button>
      }
      title="Register a new branch"
      action={createBranchAction}
      submitLabel="Create branch"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Branch name">
          <Input name="name" required placeholder="CAMI Church — Lekki" />
        </Field>
        <Field label="Branch code">
          <Input name="code" required placeholder="LEKKI-01" />
        </Field>
        <Field label="Address">
          <Input name="address" placeholder="Street address" />
        </Field>
        <Field label="City">
          <Input name="city" placeholder="City" />
        </Field>
        <Field label="State">
          <Input name="state" placeholder="State" />
        </Field>
        <Field label="Contact phone">
          <Input name="contactPhone" placeholder="+234..." />
        </Field>
        <Field label="Contact email">
          <Input name="contactEmail" type="email" placeholder="branch@camichurch.org" />
        </Field>
        <Field label="Service schedule">
          <Input name="serviceSchedule" placeholder="Sundays 8am & 10am" />
        </Field>
      </div>
    </ModalForm>
  );
}
