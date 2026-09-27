"use client";

import { useActionState } from "react";
import { Button, ErrorText, Field, Input } from "@/components/ui/primitives";
import { updateBrandingAction } from "./actions";

export function BrandingForm({
  churchName,
  primaryColor,
  logoFileAssetId,
}: {
  churchName: string;
  primaryColor: string;
  logoFileAssetId: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Church name">
          <Input name="churchName" defaultValue={churchName} required />
        </Field>
        <Field label="Primary color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              name="primaryColor"
              defaultValue={primaryColor}
              className="h-9 w-12 shrink-0 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
            />
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Logo (square image works best)">
            <div className="flex items-center gap-3">
              {logoFileAssetId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${logoFileAssetId}`} alt="Current logo" className="h-10 w-10 rounded object-cover" />
              )}
              <Input name="logo" type="file" accept="image/*" />
            </div>
          </Field>
        </div>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save branding"}
      </Button>
      {state?.success && <span className="ml-3 text-xs text-emerald-600 dark:text-emerald-400">Saved.</span>}
    </form>
  );
}
