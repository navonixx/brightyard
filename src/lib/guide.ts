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

// The playbook: find a real business, rebuild its website, and send the owner a personal
// email with a link to their new site. Goal: $100 in the first 30 days.
export const GUIDE: GuidePhase[] = [
  {
    id: "setup",
    title: "One-time setup",
    days: "Day 1",
    goal: "Every email goes out with the right name and address, and you can take payment.",
    steps: [
      {
        id: "setup-domain",
        title: "Use a dedicated Gmail account for outreach",
        body: "Send from alderwellcreative@gmail.com, never from a personal inbox — if Gmail ever restricts the account, nothing personal is affected. In Gmail, set the display name to match your sender name and add a profile photo: a real face next to the name noticeably increases replies.",
      },
      {
        id: "setup-mailbox",
        title: "Fill in Settings",
        body: "Pick your sender name, sending Gmail, goal and start date from the dropdowns. The postal address is the one thing you type: US law (CAN-SPAM) requires a real mailing address in every commercial email, and a PO box or virtual mailbox is fine. Until it is filled in, emails show {business address} at the bottom.",
        link: { label: "Open Settings", href: "/admin/settings" },
      },
      {
        id: "setup-money",
        title: "Add your PayPal.me link",
        body: "When a prospect clicks “Make it live” and picks an amount, they are shown this link. Create a PayPal Business account, copy your paypal.me link, and paste it into Settings.",
        link: { label: "Settings", href: "/admin/settings" },
      },
      {
        id: "setup-warmup",
        day: "Days 1–5",
        title: "Warm up the new Gmail account",
        body: "For the first four or five days, send 5–10 ordinary emails a day to people you know and get replies back. A brand-new account that immediately emails strangers looks suspicious to Google. Keep building leads in the meantime.",
      },
    ],
  },
  {
    id: "build",
    title: "For each prospect: find and build",
    days: "3–5 prospects a day",
    goal: "Every prospect has a finished redesign and a personal email ready to send.",
    steps: [
      {
        id: "build-cities",
        title: "Stick to one niche and one city at a time",
        body: "Current niche: lawn care and landscaping. Choose mid-size US cities such as Spokane WA, Tulsa OK, Knoxville TN, Boise ID or Chattanooga TN — big cities are crowded with agencies. Always include the state, for example “Spokane, WA”.",
      },
      {
        id: "build-find",
        title: "Click “Find & build” on the Leads page",
        body: "Choose a trade, a city and how many leads (1, 3 or 5). The app finds businesses that already have a website, reads their site, and prepares a redesign, theme, photos and a personal email for each one. It takes 30–60 seconds. For an existing lead, the “Auto-build” button on its page does the same thing.",
        link: { label: "Leads", href: "/admin/leads" },
      },
      {
        id: "build-email",
        title: "Check the research against their real site",
        body: "Open the lead. At the top you will see two links: their current site and the new one. The Notes field contains the auto-research: the hook (what is distinctive about them) and the weak spot on their current site. Spend one minute confirming the owner's name, the years in business and the services. If no email was found, the notes link to their contact form.",
      },
      {
        id: "build-sample",
        title: "Review the new site",
        body: "Open the new site while logged in to admin (visits from admin are not counted as prospect views). Check the name, phone number and services, then look at it on your phone. If the look doesn't suit them, choose a different design theme under Details. When the client sends real photos, upload them and make the best one the hero image.",
      },
      {
        id: "build-100",
        title: "What a good prospect looks like",
        body: "Best: a small, owner-run business with good reviews and an old or thin website (Wix, Weebly or GoDaddy builder, one or two short pages, hard to read on a phone). Skip companies that already have a large, modern site — they have an agency and won't switch.",
      },
    ],
  },
  {
    id: "outreach",
    title: "Sending: one personal email at a time",
    days: "10 a day, then up to 20",
    goal: "The owner can tell a real person looked at their business — because one did.",
    steps: [
      {
        id: "out-first",
        title: "Read the draft once before sending",
        body: "Every draft opens with something specific from their own site, makes one honest observation, gives the link to their new site on its own line, says the photos are placeholders, and ends with a question that takes two seconds to answer. Read it once to make sure every fact is right. {me} is replaced with your sender name automatically.",
        link: { label: "Outreach", href: "/admin/outreach" },
      },
      {
        id: "out-scale",
        title: "Never put these in an email",
        body: "“I hope this email finds you well”, “we are a leading agency”, limited-time offers, promised results such as “double your leads”, more than two links, attachments, banners, ALL CAPS or emoji. Never claim to be local to them or a customer of theirs. What is true is enough: you build websites for small businesses, you looked at theirs, and you built a better one.",
      },
      {
        id: "out-hot",
        title: "Send: Open in Gmail → Send → Sent",
        body: "On the Outreach page, click “Open in Gmail” — the email opens fully written. Send it, then click “Sent” here. For leads without an email address, click “Copy email” on the lead and paste it into their website's contact form. Send 10 a day in the first week, never more than 20. Use Gmail's Schedule send to deliver Tuesday–Thursday at 8–10 am in their time zone.",
        link: { label: "Outreach", href: "/admin/outreach" },
      },
      {
        id: "out-reply",
        title: "Follow up on day 3 and day 7",
        body: "Leads that haven't replied appear under “Follow-ups due” on the Outreach page with the text already written (it changes depending on whether they opened their link). Reply to your original email in Gmail so it stays in the same thread, then click “Sent”. Stop after two follow-ups. If anyone says no, set the lead's status to Opted out and never email them again.",
        link: { label: "Dashboard", href: "/admin" },
      },
    ],
  },
  {
    id: "close",
    title: "When they reply: close and deliver",
    days: "Whenever someone answers",
    goal: "Your first 2–3 paying clients — $100 or more.",
    steps: [
      {
        id: "close-pay",
        title: "Reply within two hours",
        body: "If they want changes, make them in the workspace and send the same link again — it never changes. Ask for their real photos and swap out the placeholders; the site instantly feels like theirs. If they ask about price: “You choose. Most owners pay between $99 and $199 once it's live on their domain.”",
      },
      {
        id: "close-deliver",
        title: "Take payment, then go live",
        body: "When a prospect clicks “Make it live”, the amount they chose appears on the lead and on the dashboard. Send a PayPal invoice. Once paid, enter the paid amount on the lead and set its status to Won — the $100 goal meter moves. Connecting their domain is still a manual step; ask Claude to do it at that point.",
      },
      {
        id: "close-upsell",
        title: "Offer hosting and edits for $15 a month",
        body: "Once the site is live, offer hosting plus small changes for $15 a month — this is your recurring income. When the first payment arrives, upgrade Vercel to the Pro plan; the free plan is for non-commercial use only.",
      },
      {
        id: "close-proof",
        title: "Ask for a testimonial and a referral",
        body: "Two weeks after launch: “Would you mind writing one line about working with me? And do you know another business owner who needs a website?” Put their real site on the homepage in place of a concept site — real client work is the strongest proof you can show.",
      },
    ],
  },
];

export const ALL_STEPS = GUIDE.flatMap((phase) => phase.steps);

// Rough funnel math shown on the guide page (estimates, not promises).
export const FUNNEL_MATH = [
  { label: "Personal emails", value: "150" },
  { label: "Open their link (~30–40%)", value: "45–60" },
  { label: "Reply (~5–8%)", value: "8–12" },
  { label: "Pay (~25%)", value: "2–3" },
  { label: "At $50–100 each", value: "$100–300" },
];
