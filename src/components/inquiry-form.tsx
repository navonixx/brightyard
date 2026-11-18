"use client";

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "@/app/actions";
import { TRADE_META } from "@/lib/brand";
import { TRADES } from "@/lib/db/schema";

export function InquiryForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, null);

  if (state?.ok) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-2xl font-bold">You&apos;re on the list 🎉</p>
        <p className="mt-2 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="businessName">Business name *</label>
        <input id="businessName" name="businessName" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email *</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="city">City</label>
        <input id="city" name="city" className="input" placeholder="Boise, ID" />
      </div>
      <div>
        <label className="label" htmlFor="trade">What do you do?</label>
        <select id="trade" name="trade" className="input" defaultValue="landscaping">
          {TRADES.map((t) => (
            <option key={t} value={t}>{TRADE_META[t].label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="website">Current website (if any)</label>
        <input id="website" name="website" className="input" placeholder="facebook.com/yourpage" />
      </div>
      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="sm:col-span-2">
        {state?.message ? <p className="mb-3 text-sm text-danger">{state.message}</p> : null}
        <button className="btn-primary w-full py-3 text-base" disabled={pending}>
          {pending ? "Sending…" : "Build my free preview"}
        </button>
        <p className="mt-3 text-center text-xs text-muted">No credit card. No obligation. We never share your details.</p>
      </div>
    </form>
  );
}
