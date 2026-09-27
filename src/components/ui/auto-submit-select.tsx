"use client";

import { useRouter } from "next/navigation";
import { Select } from "./primitives";
import type { ComponentProps } from "react";

/**
 * A <select> that navigates immediately on change by rewriting the given
 * search param on the current URL — used for the sort/filter controls on
 * list pages so picking a value doesn't need a separate "Apply" click.
 * Resets `page` to 1 since the result set just changed.
 */
export function AutoSubmitSelect({
  paramName,
  ...props
}: ComponentProps<typeof Select> & { paramName: string }) {
  const router = useRouter();
  return (
    <Select
      {...props}
      onChange={(e) => {
        const url = new URL(window.location.href);
        if (e.target.value) url.searchParams.set(paramName, e.target.value);
        else url.searchParams.delete(paramName);
        url.searchParams.delete("page");
        router.push(`${url.pathname}?${url.searchParams.toString()}`);
      }}
    />
  );
}
