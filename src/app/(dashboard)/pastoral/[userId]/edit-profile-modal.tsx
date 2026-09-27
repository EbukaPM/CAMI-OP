"use client";

import { Pencil } from "lucide-react";
import { ModalForm } from "@/components/ui/modal";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { updateProfileAction } from "../actions";

export function EditProfileModal({
  userId,
  showGrowthFields,
  profile,
}: {
  userId: string;
  showGrowthFields: boolean;
  profile: { qualifications: string | null; bio: string | null; ordinationDate: Date | null; currentRank: string | null; salary: string | null };
}) {
  const ordinationDate = profile.ordinationDate ? new Date(profile.ordinationDate).toISOString().slice(0, 10) : "";
  return (
    <ModalForm
      trigger={
        <Button variant="secondary" size="sm">
          <Pencil size={13} /> Edit profile
        </Button>
      }
      title="Update profile"
      description={showGrowthFields ? undefined : "You can update your bio and qualifications. Rank, salary, and career history are managed by Headquarters."}
      action={updateProfileAction}
      submitLabel="Save"
    >
      <input type="hidden" name="userId" value={userId} />
      <Field label="Qualifications">
        <Input name="qualifications" defaultValue={profile.qualifications ?? ""} placeholder="B.Th, Ministry Certificate..." />
      </Field>
      <Field label="Bio">
        <Textarea name="bio" rows={3} defaultValue={profile.bio ?? ""} />
      </Field>
      <Field label="Ordination date">
        <Input name="ordinationDate" type="date" defaultValue={ordinationDate} />
      </Field>
      {showGrowthFields && (
        <>
          <Field label="Current rank / position">
            <Input name="currentRank" defaultValue={profile.currentRank ?? ""} placeholder="Associate Pastor, Senior Pastor..." />
          </Field>
          <Field label="Salary (NGN, optional)">
            <Input name="salary" type="number" min="0" step="0.01" defaultValue={profile.salary ?? ""} />
          </Field>
        </>
      )}
    </ModalForm>
  );
}
