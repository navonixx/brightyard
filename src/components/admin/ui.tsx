"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Loader2 } from "lucide-react";
import type { ActionState } from "@/app/admin/actions";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** A <form> wired to a Server Action that returns { ok, message }. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState<(ActionState & { nonce?: number }) | null, FormData>(
    async (prev, form) => {
      const result = await action(prev, form);
      return result ? { ...result, nonce: Date.now() } : result;
    },
    null,
  );
  return (
    <form
      action={formAction}
      className={className}
      key={resetOnSuccess && state?.ok ? state.nonce : undefined}
    >
      {children}
      {state?.message ? (
        <p className={`mt-2 text-sm ${state.ok ? "text-brand" : "text-danger"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

/** Button that runs a no-form Server Action and shows its message. */
export function ActionButton({
  action,
  children,
  pendingText = "Working…",
  className = "btn-primary",
  confirm,
}: {
  action: () => Promise<ActionState | void>;
  children: ReactNode;
  pendingText?: string;
  className?: string;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const result = await action();
            setMessage(result?.message ? { ok: result.ok, text: result.message } : null);
          });
        }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {pendingText}
          </>
        ) : (
          children
        )}
      </button>
      {message ? (
        <span className={`text-xs ${message.ok ? "text-brand" : "text-danger"}`}>{message.text}</span>
      ) : null}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost px-3 py-1.5 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : label}
    </button>
  );
}

export function GuideCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (done: boolean) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState(checked);
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? "Mark as not done" : "Mark as done"}
      disabled={pending}
      onClick={() => {
        const next = !optimistic;
        setOptimistic(next);
        start(() => onToggle(next));
      }}
      className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${
        optimistic ? "border-brand bg-brand text-white" : "border-line bg-card hover:border-brand"
      }`}
    >
      {optimistic ? <Check className="size-4" strokeWidth={3} /> : null}
    </button>
  );
}
