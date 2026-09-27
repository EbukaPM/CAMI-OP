"use client";

import { Plus } from "lucide-react";
import { AnnouncementScope } from "@prisma/client";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { createAnnouncementAction } from "./actions";

export function CreateAnnouncementModal() {
  return (
    <ModalForm
      trigger={
        <Button>
          <Plus size={14} /> Post announcement
        </Button>
      }
      title="Post an announcement"
      action={createAnnouncementAction}
      submitLabel="Post announcement"
    >
      <Field label="Title">
        <Input name="title" required />
      </Field>
      <Field label="Scope">
        <Select name="scope" required defaultValue={AnnouncementScope.ALL}>
          <option value={AnnouncementScope.ALL}>Everyone</option>
          <option value={AnnouncementScope.BRANCH}>My branch</option>
        </Select>
      </Field>
      <Field label="Message">
        <Textarea name="body" rows={3} required />
      </Field>
    </ModalForm>
  );
}
