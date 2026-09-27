"use client";

import { Plus } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Select } from "@/components/ui/primitives";
import { grantUserModuleAction } from "./actions";

export function GrantAccessModal({
  users,
  modules,
}: {
  users: { id: string; fullName: string }[];
  modules: { key: string; label: string }[];
}) {
  return (
    <ModalForm
      trigger={
        <Button size="sm" variant="secondary">
          <Plus size={14} /> Grant access
        </Button>
      }
      title="Grant a user extra module access"
      description="Gives this user access to a module beyond what their role normally allows, without changing their role."
      action={grantUserModuleAction}
      submitLabel="Grant access"
    >
      <Field label="User">
        <Select name="userId" required defaultValue="">
          <option value="" disabled>
            Select user
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Module">
        <Select name="module" required defaultValue="">
          <option value="" disabled>
            Select module
          </option>
          {modules.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
    </ModalForm>
  );
}
