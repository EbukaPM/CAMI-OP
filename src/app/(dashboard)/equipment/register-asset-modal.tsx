"use client";

import { Plus } from "lucide-react";
import { AssetCondition } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { createAssetAction } from "./actions";

export function RegisterAssetModal({
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
          <Plus size={14} /> Register equipment
        </Button>
      }
      title="Register equipment"
      action={createAssetAction}
      submitLabel="Add asset"
      size="lg"
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
        <Field label="Name">
          <Input name="name" required placeholder="PA System, Projector, Generator..." />
        </Field>
        <Field label="Category">
          <Input name="category" required placeholder="Sound, IT, Furniture..." />
        </Field>
        <Field label="Serial number">
          <Input name="serialNumber" />
        </Field>
        <Field label="Location">
          <Input name="location" placeholder="Main auditorium" />
        </Field>
        <Field label="Purchase value (NGN)">
          <Input name="purchaseValue" type="number" min="0" step="0.01" required />
        </Field>
        <Field label="Purchase date">
          <Input name="purchaseDate" type="date" />
        </Field>
        <Field label="Condition">
          <Select name="condition" required defaultValue={AssetCondition.GOOD}>
            {Object.values(AssetCondition)
              .filter((c) => c !== "DISPOSED")
              .map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Photo / manual (optional, max 4MB)">
            <Input name="photo" type="file" accept="image/*,.pdf" />
          </Field>
        </div>
      </div>
    </ModalForm>
  );
}
