"use client";

import { Plus } from "lucide-react";
import { RequestType, RequestPriority } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { createRequestAction } from "./actions";

export function CreateRequestModal({
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
          <Plus size={14} /> Submit request
        </Button>
      }
      title="Submit a request"
      description="Branch → Verification → Headquarters Approval → Approval/Rejection → Disbursement Confirmation."
      action={createRequestAction}
      submitLabel="Submit request"
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
        <Field label="Type">
          <Select name="type" required defaultValue={RequestType.FUNDS}>
            {Object.values(RequestType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input name="title" required placeholder="Sanctuary roof repair" />
        </Field>
        <Field label="Priority">
          <Select name="priority" required defaultValue={RequestPriority.NORMAL}>
            {Object.values(RequestPriority).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (NGN, optional)">
          <Input name="amount" type="number" min="0" step="0.01" />
        </Field>
        <Field label="Requested date">
          <Input name="requestedDate" type="date" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea name="description" required rows={3} />
          </Field>
        </div>
      </div>
    </ModalForm>
  );
}
