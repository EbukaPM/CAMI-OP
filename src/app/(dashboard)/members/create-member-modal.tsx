"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { createMemberAction } from "./actions";

export function CreateMemberModal({
  branches,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string;
}) {
  const hq = branches.length > 0;
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> Add member
        </Button>
      }
      title="Add a member"
      action={createMemberAction}
      submitLabel="Add member"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hq ? (
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
        ) : (
          <input type="hidden" name="branchId" value={defaultBranchId} />
        )}
        <Field label="First name">
          <Input name="firstName" required />
        </Field>
        <Field label="Last name">
          <Input name="lastName" required />
        </Field>
        <Field label="Phone">
          <Input name="phone" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" />
        </Field>
        <Field label="Date of birth">
          <Input name="dateOfBirth" type="date" />
        </Field>
        <Field label="Gender">
          <Select name="gender" defaultValue="">
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </Field>
        <Field label="Occupation">
          <Input name="occupation" />
        </Field>
      </div>
    </ModalForm>
  );
}
