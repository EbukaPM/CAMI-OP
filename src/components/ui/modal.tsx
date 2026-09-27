"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, ErrorText } from "./primitives";
import type { ActionState } from "@/lib/action-state";

export type { ActionState };

/**
 * A create/edit form that lives inside a modal dialog. Deliberately does NOT
 * close on outside click or Escape (onInteractOutside/onEscapeKeyDown are
 * suppressed below) — only an explicit Cancel, a successful save, or
 * navigating away via the sidebar should dismiss it, per how this app wants
 * forms to behave.
 */
export function ModalForm({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Save",
  size = "md",
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the dialog is a one-shot reaction to a completed server action, not a render loop
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 ${
            size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-xs text-slate-500">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form ref={formRef} action={formAction} className="space-y-4">
            {children}
            <ErrorText>{state?.error}</ErrorText>
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" disabled={pending}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : submitLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
