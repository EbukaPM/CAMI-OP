"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { recordExpenseAction } from "./actions";

export function SubmitExpenseModal({
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
        <Button variant="secondary">
          <Plus size={14} /> Submit expense
        </Button>
      }
      title="Submit an expense for approval"
      action={recordExpenseAction}
      submitLabel="Submit expense"
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
        <Input name="category" required placeholder="Utilities, Repairs, Supplies..." />
      </Field>
      <Field label="Amount (NGN)">
        <Input name="amount" type="number" min="0" step="0.01" required />
      </Field>
      <Field label="Description">
        <Input name="description" />
      </Field>
    </ModalForm>
  );
}
