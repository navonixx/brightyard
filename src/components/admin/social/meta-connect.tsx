"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/app/admin/actions";

/**
 * Connect form with controlled inputs: React resets plain forms after every submit, which wiped
 * the App ID/secret whenever one field was missing. Here the values stay until it succeeds.
 */
export function MetaConnectForm({ action }: { action: (state: ActionState, form: FormData) => Promise<ActionState> }) {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [userToken, setUserToken] = useState("");
  const [state, formAction] = useActionState<ActionState | null, FormData>(action, null);
  const [pending, start] = useTransition();

  const tick = (ok: boolean) => (ok ? <span className="text-emerald-600">✓</span> : null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault(); // no automatic form reset
        const data = new FormData(e.currentTarget);
        start(() => formAction(data));
      }}
      className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="appId">App ID {tick(/^\d{6,}$/.test(appId.trim()))}</label>
        <input id="appId" name="appId" value={appId} onChange={(e) => setAppId(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="e.g. 1659625875708420" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="appSecret">App secret {tick(/^[a-f0-9]{16,}$/i.test(appSecret.trim()))}</label>
        <input id="appSecret" name="appSecret" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} type="password" autoComplete="off" placeholder="App settings → Basic → Show" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="userToken">Access token (from Graph API Explorer) {tick(userToken.trim().length >= 50)}</label>
        <input id="userToken" name="userToken" value={userToken} onChange={(e) => setUserToken(e.target.value)} type="password" autoComplete="off" placeholder="Graph API Explorer → Generate Access Token → copy" className="input" />
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? <><Loader2 className="size-4 animate-spin" /> Connecting…</> : <>Connect Instagram &amp; Facebook</>}
        </button>
        {state?.message ? <p className={`mt-2 text-sm ${state.ok ? "text-brand" : "text-danger"}`}>{state.message}</p> : null}
      </div>
    </form>
  );
}
