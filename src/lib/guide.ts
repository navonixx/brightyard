export type GuideStep = {
  id: string;
  title: string;
  body: string;
  day?: string;
  link?: { label: string; href: string };
};

export type GuidePhase = {
  id: string;
  title: string;
  days: string;
  goal: string;
  steps: GuideStep[];
};

// Admin ke liye 30-din ka playbook. Goal: $100 pehle 30 din mein.
export const GUIDE: GuidePhase[] = [
  {
    id: "setup",
    title: "Setup",
    days: "Day 1–3",
    goal: "Site live ho, keys lagi hon, email domain warm-up shuru ho jaye.",
    steps: [
      {
        id: "setup-env",
        day: "Day 1",
        title: "Keys .env.local mein bharo",
        body: "brightyard/.env.local kholo. DATABASE_URL (Neon/Supabase ka connection string), ANTHROPIC_API_KEY, IMAGEKIT_PRIVATE_KEY + IMAGEKIT_URL_ENDPOINT, GOOGLE_PLACES_API_KEY, TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. Keys kabhi chat ya GitHub par paste mat karna. Settings page par green tick dikhega jab key sahi lagegi.",
        link: { label: "Settings kholo", href: "/admin/settings" },
      },
      {
        id: "setup-deploy",
        day: "Day 1",
        title: "GitHub par push + Vercel par deploy",
        body: "Private GitHub repo banao, code push karo, Vercel mein import karo. Vercel → Settings → Environment Variables mein .env.local wali saari keys daalo, aur NEXT_PUBLIC_SITE_URL ko apne live URL par set karo. Note: Vercel ka free Hobby plan non-commercial use ke liye hai — pehla payment aate hi Pro par jaana ya Netlify/Cloudflare dekhna.",
      },
      {
        id: "setup-domain",
        day: "Day 1",
        title: "2 domain lo: ek site ke liye, ek cold email ke liye",
        body: "Main domain (jaise brightyard.studio) website ke liye. Alag cold-email domain (jaise trybrightyard.com) sirf outreach ke liye — main domain se kabhi cold email nahi. Kharidne se pehle availability aur renewal price check karo.",
      },
      {
        id: "setup-mailbox",
        day: "Day 2",
        title: "Cold domain par 2 inbox + SPF/DKIM/DMARC",
        body: "Google Workspace ya Zoho par 2 inbox banao (jaise alex@ aur hello@). DNS mein SPF, DKIM, DMARC records lagao. Bina inke mail spam mein jayega.",
      },
      {
        id: "setup-warmup",
        day: "Day 2",
        title: "Instantly/Smartlead mein warm-up ON",
        body: "Dono inbox connect karo aur warm-up chalu karo. 14 din tak koi cold email nahi — is beech leads aur previews banao.",
      },
      {
        id: "setup-money",
        day: "Day 3",
        title: "PayPal business + PayPal.me link",
        body: "PayPal business account (PAN + bank link). PayPal.me link Settings mein daalo — jab koi 'Make it live' dabata hai to use yahi link dikhta hai.",
        link: { label: "Settings", href: "/admin/settings" },
      },
      {
        id: "setup-address",
        day: "Day 3",
        title: "Sender naam + business address Settings mein",
        body: "US ka CAN-SPAM law har cold email mein sahi sender naam aur physical postal address maangta hai. Ye email draft ke footer mein apne aap lagta hai.",
        link: { label: "Settings", href: "/admin/settings" },
      },
    ],
  },
  {
    id: "build",
    title: "Leads + free previews",
    days: "Day 3–14",
    goal: "Day 14 tak 100 leads jinke preview ready hon.",
    steps: [
      {
        id: "build-cities",
        title: "5 mid-size US cities chuno",
        body: "Bade shehar (NYC, LA) mein competition zyada hai. Shuru karo: Boise ID, Knoxville TN, Spokane WA, Tulsa OK, Chattanooga TN. Ek trade se shuru karo — landscaping ya pressure washing sabse achhe hain (bahut se bina website ke hote hain).",
      },
      {
        id: "build-find",
        title: "Roz 20 leads: Leads → Find leads",
        body: "Search karo jaise \"landscaping in Boise, ID\". System apne aap score karta hai: bina website + 4.5★ + 20+ reviews = sabse upar. Score 60+ wale pehle lo.",
        link: { label: "Leads", href: "/admin/leads" },
      },
      {
        id: "build-email",
        title: "Har lead ka email dhundho",
        body: "Unka Facebook page, Google profile, purani website, ya Hunter.io. Email nahi mila to lead skip karo — US numbers par cold SMS/WhatsApp mat bhejna (TCPA law, bhaari penalty).",
      },
      {
        id: "build-sample",
        title: "Workspace mein preview banao",
        body: "Lead kholo → 'Generate copy' → copy padho aur theek karo → 1–3 images upload karo (AI se bani, ya stock). Phone par preview kholkar dekho. Har preview par 5–8 minute, isse zyada nahi.",
      },
      {
        id: "build-100",
        title: "Day 14: 100 preview ready",
        body: "Dashboard par 'Preview ready' count 100 hona chahiye. Kam hai to Day 15 se pehle complete karo.",
        link: { label: "Dashboard", href: "/admin" },
      },
    ],
  },
  {
    id: "outreach",
    title: "Outreach",
    days: "Day 15–30",
    goal: "400–600 personal emails, har reply 2 ghante mein.",
    steps: [
      {
        id: "out-first",
        day: "Day 15",
        title: "Pehle 20 emails (10 per inbox)",
        body: "Outreach page se CSV download karo → Instantly mein import → sequence: Email 1 (Day 0), follow-up (Day 3), last note (Day 7). Upload ke baad 'Mark as emailed' dabao.",
        link: { label: "Outreach", href: "/admin/outreach" },
      },
      {
        id: "out-scale",
        day: "Day 18+",
        title: "40–60 emails/day tak badhao",
        body: "Har inbox se 20–30/day se zyada nahi. Bounce 3% se upar jaye to ruk kar list saaf karo.",
      },
      {
        id: "out-hot",
        title: "Roz subah: 'Opened their preview' list dekho",
        body: "Dashboard batata hai kisne apna preview khola aur kitni baar. 2+ baar khola = garam lead. Usse ek chhota personal note bhejo: \"Saw you had a look — want me to change anything?\"",
        link: { label: "Dashboard", href: "/admin" },
      },
      {
        id: "out-reply",
        title: "Replies 2 ghante ke andar",
        body: "Telegram alert aate hi jawab do. Changes maange to workspace mein edit karo aur wahi link dobara bhejo — link same rehta hai.",
      },
    ],
  },
  {
    id: "close",
    title: "Close + deliver",
    days: "Jab bhi koi 'Make it live' dabaye",
    goal: "Pehle 2–3 paying clients = $100+.",
    steps: [
      {
        id: "close-pay",
        title: "Payment lo",
        body: "Client ne jo amount chuna woh lead par dikhega. PayPal invoice bhejo. $150 se upar ho to 50% pehle. Payment aaye to lead par 'Paid amount' bharo aur status 'won' karo — dashboard ka $100 meter badhega.",
      },
      {
        id: "close-deliver",
        title: "Site live karo",
        body: "Client ka domain hai to uska DNS hamare Vercel project se jodo; nahi hai to domain khareedne mein madad karo (cost client ka). Live karne ke baad lead ke notes mein domain likho.",
      },
      {
        id: "close-upsell",
        title: "Upsell: AI photo set ya 15-sec promo video",
        body: "Site live hone ke 1 hafte baad offer karo: $49 mein 6 AI photos ya $79 mein 15-second promo video (unke Facebook/Google profile ke liye). Monthly hosting + small edits $15/mo.",
      },
      {
        id: "close-proof",
        title: "Testimonial + referral",
        body: "2 hafte baad: \"Would you mind leaving a one-line review? And do you know another business owner who needs a site?\" Testimonial ko homepage par lagao.",
      },
    ],
  },
];

export const ALL_STEPS = GUIDE.flatMap((phase) => phase.steps);

// Rough funnel math shown on the guide page (estimates, not promises).
export const FUNNEL_MATH = [
  { label: "Emails sent", value: "500" },
  { label: "Preview opened (~15–25%)", value: "75–125" },
  { label: "Interested (~2–3%)", value: "10–15" },
  { label: "Paid (~20–30% of interested)", value: "2–4" },
  { label: "At ~$50–100 each", value: "$100–400" },
];
