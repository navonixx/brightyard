"use client";

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "@/app/actions";

const field =
  "w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-[17px] tracking-[-0.374px] text-graphite outline-none placeholder:text-graphite-48/70 focus:border-action-focus focus:ring-4 focus:ring-action-focus/15";
const labelCls = "mb-1.5 block text-[14px] tracking-[-0.224px] text-graphite-80";

export function InquiryForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, null);

  if (state?.ok) {
    return (
      <div className="rounded-[18px] bg-canvas p-10 text-center text-graphite">
        <p className="t-section">You&apos;re on the list 🎉</p>
        <p className="t-body mt-2 text-graphite-48">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5 rounded-[18px] bg-canvas p-6 text-left text-graphite sm:grid-cols-2 sm:p-10">
      <div>
        <label className={labelCls} htmlFor="name">Your name</label>
        <input id="name" name="name" className={field} autoComplete="name" />
      </div>
      <div>
        <label className={labelCls} htmlFor="businessName">Business name *</label>
        <input id="businessName" name="businessName" required className={field} />
      </div>
      <div>
        <label className={labelCls} htmlFor="email">Email *</label>
        <input id="email" name="email" type="email" required className={field} autoComplete="email" />
      </div>
      <div>
        <label className={labelCls} htmlFor="city">City</label>
        <input id="city" name="city" className={field} placeholder="Boise, ID" />
      </div>
      <div>
        <label className={labelCls} htmlFor="about">What do you sell or do?</label>
        <input id="about" name="about" className={field} placeholder="Skincare, landscaping, a café…" />
      </div>
      <div>
        <label className={labelCls} htmlFor="website">Current website (if any)</label>
        <input id="website" name="website" className={field} placeholder="facebook.com/yourpage" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={labelCls}>What do you need? (pick any)</legend>
        <div className="flex flex-wrap gap-2">
          {["A new website", "A website redesign", "Product photography", "Video / motion ads"].map((service) => (
            <label key={service} className="cursor-pointer">
              <input type="checkbox" name="need" value={service} defaultChecked={service === "A new website"} className="peer sr-only" />
              <span className="inline-flex rounded-full border border-hairline px-4 py-2 text-[15px] transition peer-checked:border-action-focus peer-checked:bg-action peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-action-focus">
                {service}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="sm:col-span-2">
        {state?.message ? <p className="t-caption mb-3 text-[#d70015]">{state.message}</p> : null}
        <button className="pill-primary w-full" disabled={pending}>
          {pending ? "Sending…" : "Start my project"}
        </button>
        <p className="t-fine mt-4 text-center text-graphite-48">No credit card. No obligation. We never share your details.</p>
      </div>
    </form>
  );
}
