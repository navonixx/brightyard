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

async function Settings() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="card p-6">
        <h2 className="font-semibold">Business details</h2>
        <p className="mt-1 text-sm text-muted">Email footer aur payment link yahin se aata hai.</p>
        <ActionForm action={saveSettingsAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="startDate">Sprint start date</label>
            <input id="startDate" name="startDate" type="date" defaultValue={settings.startDate} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="goalUsd">Goal ($)</label>
            <input id="goalUsd" name="goalUsd" inputMode="numeric" defaultValue={settings.goalUsd} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="senderName">Sender name (email signature)</label>
            <input id="senderName" name="senderName" defaultValue={settings.senderName} placeholder="Ethan from Alderwell Creative" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="senderEmail">Sending Gmail address</label>
            <input id="senderEmail" name="senderEmail" type="email" defaultValue={settings.senderEmail} placeholder="alderwellcreative@gmail.com" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="paypalLink">PayPal.me link</label>
            <input id="paypalLink" name="paypalLink" defaultValue={settings.paypalLink} placeholder="https://paypal.me/yourname" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="businessAddress">Business postal address (required by CAN-SPAM)</label>
            <input id="businessAddress" name="businessAddress" defaultValue={settings.businessAddress} className="input" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Save settings</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted">
          Keys <code className="rounded bg-paper px-1">.env.local</code> (local) aur Vercel Environment Variables mein lagti hain — yahan sirf status dikhta hai.
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
