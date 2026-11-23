import { Download } from "lucide-react";
import { CopyButton } from "@/components/admin/ui";
import { SoHeader } from "@/components/admin/social/header";
import { metaConnected } from "@/lib/social/publish";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { PageSkeleton } from "@/components/admin/skeleton";

const SITE = "alderwellcreative.vercel.app";

const KIT = [
  {
    platform: "Instagram",
    steps: [
      "Create the account in the Instagram app with the studio's Gmail, username suggestion below.",
      "Settings → Account type and tools → Switch to professional account → Business → category “Marketing agency”.",
      "Add the profile photo, bio and website link below.",
      "Link it to the Facebook Page (Settings → Accounts Center) — needed for auto-posting.",
    ],
    fields: [
      { k: "Username ideas", v: "alderwellcreative · alderwell.studio · alderwellco" },
      { k: "Name", v: "Alderwell Creative | Websites & Ads" },
      { k: "Bio (150 characters)", v: "Websites, product photos, video ads & marketing for small businesses.\nFirst project free — pay what it's worth.\n👇 Start here" },
      { k: "Website", v: `https://${SITE}` },
    ],
  },
  {
    platform: "Facebook Page",
    steps: ["facebook.com/pages/create → Business or brand.", "Category: Marketing Agency. Add the profile photo and cover below.", "Add the website and the same bio; turn on Messenger replies."],
    fields: [
      { k: "Page name", v: "Alderwell Creative" },
      { k: "About", v: "Alderwell Creative is a small creative and marketing studio for US small businesses: websites, product photography, video ads, ad campaigns and digital marketing. Your first project is free — you pay what you feel it's worth." },
    ],
  },
  {
    platform: "YouTube",
    steps: ["youtube.com → Create a channel → use a custom name.", "Upload the banner and profile photo below.", "Shorts = the vertical reels from the Posts page (under 60 s)."],
    fields: [
      { k: "Channel name", v: "Alderwell Creative" },
      { k: "Handle ideas", v: "@alderwellcreative · @alderwellstudio" },
      { k: "Description", v: "Websites, product photography and short video ads for small businesses — made before you pay. Concept campaigns, before/after website rebuilds and quick marketing tips.\n\nStart a project: https://" + SITE },
    ],
  },
];

const FILES = [
  { label: "Profile photo 1080×1080", href: "/brand/profile-1080.jpg" },
  { label: "YouTube banner 2560×1440", href: "/brand/youtube-banner.jpg" },
  { label: "Facebook cover 1640×624", href: "/brand/facebook-cover.jpg" },
];

export default function SetupPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Setup />
    </Suspense>
  );
}

async function Setup() {
  await requireAdmin();
  const meta = metaConnected();
  return (
    <div className="space-y-6">
      <SoHeader active="/admin/social/setup" title="Account setup" intro="Everything to create the accounts in about an hour — names, bios, images — and what's needed later to post automatically." />

      <section className="card p-5">
        <h2 className="font-semibold">Brand images</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILES.map((f) => (
            <a key={f.href} href={f.href} download className="btn-ghost">
              <Download className="size-4" /> {f.label}
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {KIT.map((k) => (
          <section key={k.platform} className="card space-y-3 p-5">
            <h2 className="font-semibold">{k.platform}</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
              {k.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            {k.fields.map((f) => (
              <div key={f.k} className="rounded-xl bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{f.k}</p>
                  <CopyButton text={f.v} />
                </div>
                <p className="mt-1 whitespace-pre-line text-sm">{f.v}</p>
              </div>
            ))}
          </section>
        ))}
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Automatic posting</h2>
        <p className="text-sm">
          Instagram + Facebook: {meta ? "✅ connected — approved posts can be published from the Posts page." : "⚪ not connected yet."}
        </p>
        {!meta ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
            <li>Finish the Instagram Business account and the Facebook Page, and link them.</li>
            <li>Tell Claude — it will walk you through creating a Meta app and a long-lived Page token (about 15 minutes, official API, no passwords shared).</li>
            <li>The token goes into Vercel as META_PAGE_TOKEN, META_PAGE_ID and META_IG_USER_ID. After that, approved posts publish by themselves at their time.</li>
          </ol>
        ) : null}
        <p className="text-sm">YouTube Shorts: post by hand for now (download the reel, upload in the YouTube app). Automatic upload needs Google to verify the app first.</p>
        <p className="text-xs text-muted">Rules we keep: no bought followers, no auto-likes or cold DMs (they get accounts banned), and portfolio campaigns are always labelled as concept work made with AI-assisted imaging.</p>
      </section>
    </div>
  );
}
