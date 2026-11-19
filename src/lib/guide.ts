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

// Admin ke liye playbook. Tareeka: asli business dhundho → uski purani website ka naya version
// banao → uska personal link ek personal email mein bhejo. Goal: pehle 30 din mein $100.
export const GUIDE: GuidePhase[] = [
  {
    id: "setup",
    title: "Ek baar ka setup",
    days: "Day 1",
    goal: "Emails sahi naam aur address ke saath jayein, aur payment lene ka raasta ready ho.",
    steps: [
      {
        id: "setup-domain",
        title: "Sending ke liye naya Gmail banao",
        body: "Ek alag Gmail banao, jaise alderwellcreative@gmail.com. Personal Gmail se mat bhejo — block hua to personal account bhi jayega. Gmail mein naam \"Kunj from Brightyard\" aur ek profile photo lagao: asli chehra dikhne se reply zyada aate hain.",
      },
      {
        id: "setup-mailbox",
        title: "Settings bharo (4 cheezein)",
        body: "1) Sender name — wahi jo Gmail mein hai. 2) Sending Gmail address — isse \"Open in Gmail\" sahi account mein khulta hai. 3) Business postal address — US ke CAN-SPAM law ke liye har email ke footer mein zaroori hai. 4) Sprint start date — dashboard par Day X of 30 isi se chalta hai. Jab tak ye khaali hain, email ke neeche {your name} likha aayega.",
        link: { label: "Settings kholo", href: "/admin/settings" },
      },
      {
        id: "setup-money",
        title: "PayPal.me link",
        body: "PayPal business account banao aur PayPal.me link Settings mein daalo. Jab client \"Make it live\" dabakar amount chunta hai, use yahi link dikhta hai.",
        link: { label: "Settings", href: "/admin/settings" },
      },
      {
        id: "setup-warmup",
        day: "Day 1–5",
        title: "Naye Gmail ko 4–5 din normal use karo",
        body: "Dosto ko 5–10 normal emails bhejo aur unse reply karwao. Naya account seedha anjaan logon ko mail karega to Google shak karega. Is beech neeche wale steps se leads aur sites banate raho.",
      },
    ],
  },
  {
    id: "build",
    title: "Har client ke liye: dhundho aur site banao",
    days: "Roz 3–5 clients",
    goal: "Har client ki apni redesigned site ka link ready ho. Ek client par 15–20 minute.",
    steps: [
      {
        id: "build-cities",
        title: "Ek niche + ek city chuno",
        body: "Abhi niche: lawn care / landscaping. City mid-size lo (Spokane, Tulsa, Knoxville, Boise, Chattanooga) — bade shehron mein competition zyada hai. Ek hi niche par tike raho: har site pichhli se jaldi banegi.",
      },
      {
        id: "build-find",
        title: "Leads → \"Find & build\" dabao",
        body: "Trade aur city daalo (jaise Landscaping, Spokane, WA), 3 ya 5 leads chuno. App khud website wale businesses dhundhta hai, unki site padhta hai, aur har ek ke liye nayi site, theme, photos aur email draft bana deta hai. 30–60 second lagte hain. Kisi purani lead par yahi kaam uske page ke \"Auto-build\" button se hota hai.",
        link: { label: "Leads", href: "/admin/leads" },
      },
      {
        id: "build-email",
        title: "Har lead kholo aur research check karo",
        body: "Notes mein \"Auto-research\" likha milega: Hook (unki khaas baat) aur Weak spot (unki site ki kamzori). Unki asli site khol kar 1 minute mein milao: owner ka naam sahi hai? saal sahi hai? Email nahi mila to notes mein contact form ka link hoga. AI galti kar sakta hai, aur galat fact client ke saamne sabse bura lagta hai.",
      },
      {
        id: "build-sample",
        title: "Copy aur look theek karo",
        body: "Headline, services aur About padho; jo galat ya bana-banaya lage use badal do aur \"Save copy\". Theme pasand na aaye to Details mein \"Design theme\" badlo. Photos sample hain: client ki apni photos mil jayein to unhe upload karke pehli ko hero banao. Google rating 4.5 se kam ho to app use site par nahi dikhata.",
      },
      {
        id: "build-100",
        title: "Bhejne se pehle khud dekho",
        body: "Admin mein login rehte hue \"Open preview\" dabao (login ke bina khologe to wo client ka view gina jayega). Phone par bhi dekho. Check: naam aur phone sahi, koi galat fact nahi, upar \"Redesign concept for …\" likha hai, aur \"Compare with your current site\" link unki asli site kholta hai.",
      },
    ],
  },
  {
    id: "outreach",
    title: "Email: har client ko alag, apne haath ka",
    days: "Roz 10, baad mein 20",
    goal: "Padhne wale ko lage ki ek insaan ne unki site dekh kar sirf unhe likha hai — kyunki sach mein aisa hi hai.",
    steps: [
      {
        id: "out-first",
        title: "Email draft padho aur apna banao",
        body: "Auto-build email draft bhi likh deta hai: unki khaas baat se shuruaat, ek imaandar observation, link akeli line par, \"photos placeholder hain\", aur ek sawaal. Aapka kaam: padhna, jo line aapke bolne jaisi na lage use badalna, aur check karna ki koi galat daava nahi hai. {me} ki jagah aapka naam apne aap aata hai. 110 shabdon se kam rakho.",
        link: { label: "Outreach", href: "/admin/outreach" },
      },
      {
        id: "out-scale",
        title: "Ye cheezein email mein kabhi nahi",
        body: "\"I hope this email finds you well\", \"We are a leading agency\", \"limited time\", bade vaade (\"double your leads\"), 2 se zyada links, attachments, ALL CAPS, emoji. Jhooth bilkul nahi: ye mat kaho ki tum unke shehar se ho ya unke customer ho. Jo sach hai wahi kaafi hai: \"main chhote businesses ki websites banata hoon, aapki dekhi, naya version bana diya.\"",
      },
      {
        id: "out-hot",
        title: "Bhejo: Open in Gmail → Send → Sent",
        body: "Outreach page par \"Open in Gmail\" dabao: email bhara hua khulega. Ek baar zor se padho — agar ye kisi dost ko bhejne layak nahi lagta to theek karo. Send ke baad yahan \"Sent\" dabao. Jinka email nahi mila unke liye lead par \"Copy email\" dabakar unki site ke contact form mein paste karo. Pehle hafte roz 10, phir roz 20 se zyada nahi. Subah 8–10 baje (unke time se) bhejna sabse achha.",
        link: { label: "Outreach", href: "/admin/outreach" },
      },
      {
        id: "out-reply",
        title: "Follow-up: Outreach → \"Follow-ups due\"",
        body: "Day 3 aur Day 7 par jinhone reply nahi kiya wo apne aap is list mein aa jate hain, text ke saath (link khola ya nahi, us hisaab se alag). Sabse achha: Gmail mein apne pehle email par Reply karke wahi text bhejo, phir yahan \"Sent\" dabao. 2 follow-up ke baad chhod do. Koi \"no\" kahe to lead ka status Opted out karo.",
        link: { label: "Dashboard", href: "/admin" },
      },
    ],
  },
  {
    id: "close",
    title: "Reply aaye to: close + deliver",
    days: "Jab bhi koi jawab de",
    goal: "Pehle 2–3 paying clients = $100+.",
    steps: [
      {
        id: "close-pay",
        title: "2 ghante ke andar jawab do",
        body: "Changes maange to workspace mein karo aur wahi link dobara bhejo (link badalta nahi). Unki asli photos maango aur sample photos ki jagah lagao — isse site turant \"unki\" lagti hai. Price pooche: \"You choose. Most owners pay between $99 and $199 once it's live on their domain.\"",
      },
      {
        id: "close-deliver",
        title: "Payment lo, phir live karo",
        body: "Client \"Make it live\" dabaye to chuna hua amount lead par dikhega aur Telegram/dashboard par aayega. PayPal invoice bhejo. Payment aane par lead mein Paid amount bharo aur status Won karo — dashboard ka $100 meter badhega. Phir unka domain hamari site se jodna hai: ye kaam abhi manual hai, us waqt Claude se karwana.",
      },
      {
        id: "close-upsell",
        title: "Hosting + edits: $15/mahina",
        body: "Live hone ke baad offer karo: hosting aur chhote badlav $15/month. Yahi recurring income hai. Yaad rahe: pehla payment aate hi Vercel ka Pro plan lena hoga (free plan commercial use ke liye nahi hai).",
      },
      {
        id: "close-proof",
        title: "Testimonial + referral maango",
        body: "2 hafte baad: \"Would you mind writing one line about working with me? And do you know another business owner who needs a site?\" Unki asli site hamare homepage ke concept sites ki jagah lagegi — asli client ka kaam sabse bada proof hai.",
      },
    ],
  },
];

export const ALL_STEPS = GUIDE.flatMap((phase) => phase.steps);

// Rough funnel math shown on the guide page (estimates, not promises).
export const FUNNEL_MATH = [
  { label: "Personal emails", value: "150" },
  { label: "Link khola (~30–40%)", value: "45–60" },
  { label: "Reply (~5–8%)", value: "8–12" },
  { label: "Paid (~25%)", value: "2–3" },
  { label: "$50–100 each", value: "$100–300" },
];
