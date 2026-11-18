"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { claimPreview, optOut, recordView, type ClaimState } from "../actions";
import { LogoMark } from "@/components/logo";

type Props = {
  token: string;
  businessName: string;
  claimed: boolean;
  prices: number[];
};

/** Top banner + bottom "make it live" panel shown around a prospect's preview. */
export function PreviewChrome({ token, businessName, claimed, prices }: Props) {
  const tracked = useRef(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(prices[1] ?? 99);
  const [custom, setCustom] = useState("");
  const [optedOut, setOptedOut] = useState(false);
  const [optPending, startOpt] = useTransition();
  const [state, action, pending] = useActionState<ClaimState, FormData>(
    claimPreview.bind(null, token),
    null,
  );

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void recordView(token);
  }, [token]);

  const done = claimed || state?.ok;

  return (
    <>
      <div className="sticky top-0 z-40 flex h-11 items-center justify-between gap-3 bg-ink px-3 text-paper sm:px-4">
        <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
          <LogoMark className="size-6 shrink-0" />
          <span className="truncate">
            Free preview for <strong>{businessName}</strong> · made by Brightyard
          </span>
        </div>
        {!done ? (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink sm:text-sm"
          >
            Make it live
          </button>
        ) : null}
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          {done ? (
            <p className="text-sm font-medium text-ink">
              🎉 Thanks! We&apos;ve got your request and will email you shortly to put this live.
            </p>
          ) : optedOut ? (
            <p className="text-sm text-muted">Got it — we won&apos;t contact you again.</p>
          ) : (
            <>
              <p className="text-center text-sm text-ink sm:text-left">
                <strong>Like it?</strong> Pay what you think it&apos;s worth and we&apos;ll put it live on your domain.
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  disabled={optPending}
                  onClick={() =>
                    startOpt(async () => {
                      await optOut(token);
                      setOptedOut(true);
                    })
                  }
                  className="btn text-muted hover:text-ink"
                >
                  Not for me
                </button>
                <button onClick={() => setOpen(true)} className="btn-primary">
                  Make it live
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Claim dialog */}
      {open && !done ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={() => setOpen(false)}>
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-6 text-ink shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-2xl font-bold">Put it live</p>
                <p className="mt-1 text-sm text-muted">
                  Choose what it&apos;s worth to you. You pay only after we confirm the details by email.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {prices.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    setAmount(p);
                    setCustom("");
                  }}
                  className={`rounded-xl border py-3 text-sm font-bold transition ${
                    amount === p && !custom ? "border-brand bg-brand-soft text-brand" : "border-line"
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
            <input
              className="input mt-2"
              inputMode="numeric"
              placeholder="Or enter your own amount ($)"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
            />
            <input type="hidden" name="amount" value={custom || amount} />

            <label className="label mt-4" htmlFor="email">Your email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
            <label className="label mt-3" htmlFor="note">Any changes you&apos;d like? (optional)</label>
            <textarea id="note" name="note" rows={3} className="input" />

            {state?.message ? <p className="mt-3 text-sm text-danger">{state.message}</p> : null}
            <button className="btn-primary mt-5 w-full py-3 text-base" disabled={pending}>
              {pending ? "Sending…" : `Yes, put it live for $${custom || amount}`}
            </button>
          </form>
        </div>
      ) : null}

      {state?.ok && state.paypalLink ? (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg">
          Prefer to pay now?{" "}
          <a href={`${state.paypalLink.replace(/\/$/, "")}/${state.amount}`} className="font-semibold text-sun underline">
            PayPal ${state.amount}
          </a>
        </div>
      ) : null}
    </>
  );
}
