"use client";

import { useActionState } from "react";
import { login, type ActionState } from "../actions";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, null);
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form action={action} className="card w-full max-w-sm p-8">
        <Logo />
        <p className="mt-6 font-display text-2xl font-semibold">Admin</p>
        <p className="mt-1 text-sm text-muted">Workspace for leads, previews and outreach.</p>
        <label className="label mt-6" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoFocus className="input" />
        {state?.message ? <p className="mt-3 text-sm text-danger">{state.message}</p> : null}
        <button className="btn-primary mt-6 w-full" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
