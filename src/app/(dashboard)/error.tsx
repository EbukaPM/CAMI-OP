"use client";

import { LinkButton } from "@/components/ui/primitives";

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  const isForbidden = error.name === "ForbiddenError";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {isForbidden ? "Access restricted" : "Something went wrong"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isForbidden
          ? error.message || "You don't have permission to view this page."
          : "Please try again, or contact your administrator if this keeps happening."}
      </p>
      <LinkButton href="/dashboard" className="mt-6">
        Back to dashboard
      </LinkButton>
    </div>
  );
}
