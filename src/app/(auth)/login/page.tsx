"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button, Card, CardContent, ErrorText, Field, Input } from "@/components/ui/primitives";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CAMI OP</h1>
          <p className="mt-1 text-sm text-slate-500">Church Information Management System</p>
        </div>
        <Card>
          <CardContent className="pt-5">
            <form action={formAction} className="space-y-4">
              <Field label="Email">
                <Input type="email" name="email" placeholder="you@camichurch.org" required autoFocus />
              </Field>
              <Field label="Password">
                <Input type="password" name="password" placeholder="••••••••" required />
              </Field>
              <ErrorText>{state?.error}</ErrorText>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-400">
          Contact your Headquarters administrator if you don&apos;t have an account.
        </p>
      </div>
    </div>
  );
}
