"use client";

import { Plus } from "lucide-react";
import { DocumentType, DocumentScope, Role } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { ROLE_LABELS } from "@/lib/utils";
import { createDocumentAction } from "./actions";

export function CreateDocumentModal({ branches }: { branches: { id: string; name: string }[] }) {
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> Publish document
        </Button>
      }
      title="Publish a document"
      description="Upload a file, or paste a link instead."
      action={createDocumentAction}
      submitLabel="Publish"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select name="type" required defaultValue={DocumentType.MEMO}>
            {Object.values(DocumentType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input name="title" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="File (PDF, image, doc — max 4MB)">
            <Input name="file" type="file" accept=".pdf,.doc,.docx,image/*" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Or paste a link instead">
            <Input name="fileUrl" type="url" placeholder="https://..." />
          </Field>
        </div>
        <Field label="Distribute to">
          <Select name="scope" required defaultValue={DocumentScope.ALL}>
            <option value={DocumentScope.ALL}>Everyone</option>
            <option value={DocumentScope.BRANCH}>A specific branch</option>
            <option value={DocumentScope.ROLE}>A specific role</option>
          </Select>
        </Field>
        <Field label="Branch (if scope = branch)">
          <Select name="targetBranchId" defaultValue="">
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role (if scope = role)">
          <Select name="targetRole" defaultValue="">
            <option value="">—</option>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" name="requiresAck" /> Require read acknowledgement
        </label>
      </div>
    </ModalForm>
  );
}
