"use client";

import { ArrowUpCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Select } from "@/components/ui/primitives";
import { ROLE_LABELS } from "@/lib/utils";
import { changeRoleAction } from "../actions";

export function ChangeRoleModal({ userId, currentRole }: { userId: string; currentRole: Role }) {
  return (
    <ModalForm
      trigger={
        <Button size="sm" variant="secondary">
          <ArrowUpCircle size={13} /> Change role
        </Button>
      }
      title="Change role"
      description="E.g. ordaining a Ministry Leader to Branch Pastor. This is logged in the audit trail."
      action={changeRoleAction}
      submitLabel="Update role"
    >
      <input type="hidden" name="userId" value={userId} />
      <Field label="New role">
        <Select name="role" required defaultValue={currentRole}>
          {Object.values(Role).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
    </ModalForm>
  );
}
