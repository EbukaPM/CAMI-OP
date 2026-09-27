"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { recordGivingAction } from "./actions";

export function RecordGivingModal({
  branches,
  categories,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  defaultBranchId: string;
}) {
  const hq = branches.length > 0;
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> Record giving
        </Button>
      }
      title="Record giving"
      action={recordGivingAction}
      submitLabel="Record giving"
    >
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
      <Field label="Category">
        <Select name="categoryId" required defaultValue="">
          <option value="" disabled>
            Select category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Service date">
        <Input name="serviceDate" type="date" required />
      </Field>
      <Field label="Amount (NGN)">
        <Input name="amount" type="number" min="0" step="0.01" required />
      </Field>
      <Field label="Notes">
        <Input name="notes" />
      </Field>
    </ModalForm>
  );
}
