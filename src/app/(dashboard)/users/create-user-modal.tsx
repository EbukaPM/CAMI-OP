"use client";

import { Plus } from "lucide-react";
import { Role } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { ROLE_LABELS } from "@/lib/utils";
import { createUserAction } from "./actions";

export function CreateUserModal({ branches }: { branches: { id: string; name: string }[] }) {
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> New user
        </Button>
      }
      title="Create a user"
      description="Create accounts and control role + branch scope."
      action={createUserAction}
      submitLabel="Create user"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="fullName" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Phone">
          <Input name="phone" />
        </Field>
        <Field label="Role">
          <Select name="role" required defaultValue={Role.MEMBER}>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch (leave blank for HQ roles)">
          <Select name="branchId" defaultValue="">
            <option value="">— None (HQ) —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Temporary password">
          <Input name="password" type="text" minLength={8} required placeholder="At least 8 characters" />
        </Field>
      </div>
    </ModalForm>
  );
}
