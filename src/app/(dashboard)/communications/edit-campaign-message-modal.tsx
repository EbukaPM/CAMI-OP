"use client";

import { Pencil } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Textarea } from "@/components/ui/primitives";
import { updateSmsCampaignMessageAction } from "./actions";

export function EditCampaignMessageModal({ campaignId, draftMessage }: { campaignId: string; draftMessage: string }) {
  return (
    <ModalForm
      trigger={
        <Button size="sm" variant="ghost">
          <Pencil size={13} /> Edit
        </Button>
      }
      title="Edit message before sending"
      action={updateSmsCampaignMessageAction}
      submitLabel="Save message"
    >
      <input type="hidden" name="campaignId" value={campaignId} />
      <Field label="Message">
        <Textarea name="draftMessage" rows={4} required defaultValue={draftMessage} />
      </Field>
    </ModalForm>
  );
}
