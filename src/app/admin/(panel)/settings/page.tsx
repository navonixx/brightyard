import { Suspense, type ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { saveSettingsAction } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/admin/ui";
import { ComboField } from "@/components/admin/combo-field";
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
const GOALS = ["100", "200", "300", "500", "1000"];

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Puts a saved custom value at the top of the suggestions so it stays selected. */
function suggestions(values: string[], current: string, label?: (v: string) => string) {
  const list = values.map((v) => ({ value: v, label: label?.(v) }));
  return current && !values.includes(current) ? [{ value: current, label: label?.(current) ?? current }, ...list] : list;
}

function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid gap-5 border-t border-line pt-6 first:border-t-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-8">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

async function Settings() {
  await requireAdmin();
  const settings = await getSettings();
  // eslint-disable-next-line react-hooks/purity -- Server Component, rendered once per request
  const today = new Date(Date.now());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const nextMonday = new Date(today.getTime() + (((8 - today.getUTCDay()) % 7 || 7) * 86_400_000));
  const startOptions = [
    { value: isoDay(today), label: `Today · ${isoDay(today)}` },
    { value: isoDay(tomorrow), label: `Tomorrow · ${isoDay(tomorrow)}` },
    { value: isoDay(nextMonday), label: `Next Monday · ${isoDay(nextMonday)}` },
  ];
  if (settings.startDate && !startOptions.some((o) => o.value === settings.startDate)) {
    startOptions.unshift({ value: settings.startDate, label: `Saved · ${settings.startDate}` });
  }
  const paypalUser = settings.paypalLink.replace(/^https?:\/\/(www\.)?paypal\.me\//i, "").replace(/\/.*$/, "");
  const firstName = (settings.senderName || SENDER_NAMES[0]).split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Pick from the suggestions, or choose “Type my own…” in any list.</p>
      </div>

      <section className="card p-6 sm:p-8">
        <ActionForm action={saveSettingsAction} className="space-y-6">
          <Group title="Who emails are from" description={`Emails open with “I'm ${firstName}” and are signed with this name.`}>
            <ComboField
              name="senderName"
              label="Sender name"
              options={suggestions(SENDER_NAMES, settings.senderName)}
              defaultValue={settings.senderName || SENDER_NAMES[0]}
              placeholder="e.g. Ethan from Alderwell Creative"
            />
            <ComboField
              name="senderEmail"
              label="Sending Gmail"
              inputType="email"
              options={suggestions(SENDER_EMAILS, settings.senderEmail)}
              defaultValue={settings.senderEmail || SENDER_EMAILS[0]}
              placeholder="name@gmail.com"
              hint="“Open in Gmail” always opens this account."
            />
          </Group>

          <Group title="Your 30-day sprint" description="Drives the Day X of 30 counter and the goal meter on the dashboard.">
            <ComboField
              name="startDate"
              label="Start date"
              inputType="date"
              options={startOptions}
              defaultValue={settings.startDate || startOptions[0].value}
            />
            <ComboField
              name="goalUsd"
              label="Goal"
              inputType="number"
              options={suggestions(GOALS, String(settings.goalUsd), (v) => `$${v} in 30 days`)}
              defaultValue={String(settings.goalUsd)}
              placeholder="Amount in dollars"
            />
          </Group>

          <Group title="Address & payment" description="The address is required by US law (CAN-SPAM) in every commercial email.">
            <div className="sm:col-span-2">
              <ComboField
                name="businessAddress"
                label="Postal address"
                options={[{ value: "", label: "Not set yet — emails show {business address}" }]}
                defaultValue={settings.businessAddress}
                placeholder="e.g. 123 Main St, Suite 4, City, ST 12345"
                hint="Must be a real address where you can receive mail. A PO box or virtual mailbox is fine."
              />
            </div>
            <div className="sm:col-span-2">
              <ComboField
                name="paypalUser"
                label="PayPal.me username"
                options={[{ value: "", label: "Not set yet (optional)" }]}
                defaultValue={paypalUser}
                placeholder="yourname — from paypal.me/yourname"
                hint="Shown to prospects after they click “Make it live”. You can add it when your first client says yes."
              />
            </div>
          </Group>

          <div className="flex items-center justify-end border-t border-line pt-6">
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
