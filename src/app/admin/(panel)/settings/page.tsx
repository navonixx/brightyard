import { Suspense } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { saveSettingsAction } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/ui";
import { PageSkeleton } from "@/components/admin/skeleton";

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

const INTEGRATIONS = [
  { label: "Database (Postgres)", keys: ["DATABASE_URL"], fallback: "Using local embedded database (./.data). Required on Vercel." },
  { label: "Claude API (preferred AI)", keys: ["ANTHROPIC_API_KEY"], fallback: "Not set — OpenAI is used if its key is set." },
  { label: "OpenAI API (fallback AI)", keys: ["OPENAI_API_KEY"], fallback: "Not set — templates are used if Claude is also missing." },
  { label: "ImageKit", keys: ["IMAGEKIT_PRIVATE_KEY", "IMAGEKIT_URL_ENDPOINT"], fallback: "Only pasted image URLs work." },
  { label: "Google Places", keys: ["GOOGLE_PLACES_API_KEY"], fallback: "Add leads manually or via CSV." },
  { label: "Telegram alerts", keys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"], fallback: "No phone alerts." },
  { label: "Public site URL", keys: ["NEXT_PUBLIC_SITE_URL"], fallback: "Preview links will point to localhost." },
];

const SENDER_NAMES = ["Ethan from Alderwell Creative", "Ethan | Alderwell Creative", "Ethan Alderwell"];
const SENDER_EMAILS = ["alderwellcreative@gmail.com"];
const GOALS = [100, 200, 300, 500, 1000];

/** Keeps a saved value selectable even if it isn't one of the presets. */
function withCurrent<T>(options: T[], current: T | "" | undefined): T[] {
  return current && !options.includes(current as T) ? [current as T, ...options] : options;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function Settings() {
  await requireAdmin();
  const settings = await getSettings();
  // eslint-disable-next-line react-hooks/purity -- Server Component, rendered once per request
  const today = new Date(Date.now());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const nextMonday = new Date(today.getTime() + (((8 - today.getUTCDay()) % 7 || 7) * 86_400_000));
  const startOptions = [
    { value: isoDay(today), label: `Today (${isoDay(today)})` },
    { value: isoDay(tomorrow), label: `Tomorrow (${isoDay(tomorrow)})` },
    { value: isoDay(nextMonday), label: `Next Monday (${isoDay(nextMonday)})` },
  ];
  if (settings.startDate && !startOptions.some((o) => o.value === settings.startDate)) {
    startOptions.unshift({ value: settings.startDate, label: `Current (${settings.startDate})` });
  }
  const paypalUser = settings.paypalLink.replace(/^https?:\/\/(www\.)?paypal\.me\//i, "").replace(/\/.*$/, "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="card p-6">
        <h2 className="font-semibold">Business details</h2>
        <p className="mt-1 text-sm text-muted">Used in every email footer and on the payment step.</p>
        <ActionForm action={saveSettingsAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="senderName">Sender name</label>
            <select id="senderName" name="senderName" defaultValue={settings.senderName || SENDER_NAMES[0]} className="input">
              {withCurrent(SENDER_NAMES, settings.senderName).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Emails say &quot;I&apos;m {(settings.senderName || SENDER_NAMES[0]).split(/\s+/)[0]}&quot; and sign with this name.</p>
          </div>
          <div>
            <label className="label" htmlFor="senderEmail">Sending Gmail</label>
            <select id="senderEmail" name="senderEmail" defaultValue={settings.senderEmail || SENDER_EMAILS[0]} className="input">
              {withCurrent(SENDER_EMAILS, settings.senderEmail).map((email) => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">&quot;Open in Gmail&quot; always opens this account.</p>
          </div>
          <div>
            <label className="label" htmlFor="startDate">Sprint start date</label>
            <select id="startDate" name="startDate" defaultValue={settings.startDate || startOptions[0].value} className="input">
              {startOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="goalUsd">Goal</label>
            <select id="goalUsd" name="goalUsd" defaultValue={String(settings.goalUsd)} className="input">
              {withCurrent(GOALS, settings.goalUsd).map((goal) => (
                <option key={goal} value={goal}>${goal} in 30 days</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="businessAddress">Postal address — the only field you type</label>
            <input
              id="businessAddress"
              name="businessAddress"
              defaultValue={settings.businessAddress}
              placeholder="e.g. 123 Main St, Suite 4, City, ST 12345"
              className="input"
            />
            <p className="mt-1 text-xs text-muted">
              US law (CAN-SPAM) requires a real address where you can receive mail in every commercial email. A PO box or virtual mailbox
              is fine. It must be real, so it can&apos;t be picked from a list.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="paypalUser">PayPal.me username (optional for now)</label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-card focus-within:border-brand">
              <span className="grid place-items-center bg-paper px-3 text-sm text-muted">paypal.me/</span>
              <input id="paypalUser" name="paypalUser" defaultValue={paypalUser} placeholder="yourname" className="w-full bg-transparent px-3 py-2.5 text-[15px] outline-none" />
            </div>
            <p className="mt-1 text-xs text-muted">Shown to prospects after they click &quot;Make it live&quot;. Leave empty until you have a PayPal Business account.</p>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Save settings</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted">
          Keys live in <code className="rounded bg-paper px-1">.env.local</code> (local) and in Vercel Environment Variables — this list only shows their status.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {INTEGRATIONS.map((item) => {
            const ok = item.keys.every((k) => Boolean(process.env[k]));
            return (
              <li key={item.label} className="flex items-start gap-3 py-3">
                {ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" />
                ) : (
                  <Circle className="mt-0.5 size-5 shrink-0 text-muted" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted">
                    {ok ? "Connected" : item.fallback} · <code>{item.keys.join(", ")}</code>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
