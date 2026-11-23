import type { Lead } from "./leads";
import { nicheLabel } from "./niches";

export type Sender = { name: string; company: string; address: string; site: string };

/**
 * A short, plain first email that inbox filters treat like a normal note:
 * one real finding about their business, why it matters, and a question to reply to.
 * No links, no images, no "free"/price words (links and promo words are what push cold
 * email into spam). Ends with the sender's postal address and an opt-out line (US CAN-SPAM).
 */
export function draftEmail(lead: Lead, me: Sender): { subject: string; body: string } {
  const top = (lead.pain_signals ?? [])[0];
  const first = (lead.extra?.people as string[] | undefined)?.[0]?.split(" ")[0];
  const biz = lead.name;
  const why: Record<string, string> = {
    no_website: "most people look a business up online before they call, and without a site they usually pick the next one",
    facebook_only: "most people search Google before they call, and a Facebook page rarely shows up there",
    site_broken: "anyone who clicks through from Google lands on an error and calls the next result",
    site_unreachable: "anyone who clicks through from Google may be landing on an error",
    not_mobile: "most visitors are on their phone, and they leave when a page doesn't fit the screen",
    no_https: "browsers show a “Not secure” warning next to the address",
    stale: "an old year in the footer makes people wonder if you're still open",
    slow: "most visitors give up after about three seconds",
    missed_leads: "people who find you after hours have no way to reach you except calling back later (most don't)",
    no_booking: "people who want to book right away can't, so they try somewhere else",
    few_reviews: "people compare reviews before choosing, and the shop with more reviews usually gets the call",
    low_rating: "people compare ratings before choosing",
    launch: "a new company is judged first by what people find online",
  };
  const finding = top ? lowerFirst(top.label).replace(/\s*—.*$/, "") : null;
  const lines = [
    first ? `Hi ${first},` : "Hi,",
    "",
    finding
      ? `I was looking at ${biz} online and noticed ${finding}.${why[top!.key] ? ` That matters because ${why[top!.key]}.` : ""}`
      : `I was looking at ${biz} online and had a couple of ideas that could bring in more ${lead.kind === "creator" ? "sponsors" : "customers"}.`,
    "",
    top?.solution ? `I put together a quick idea for fixing it (${lowerFirst(top.solution)}). Want me to send it over?` : "Would you like me to send over a quick idea?",
    "",
    "Thanks,",
    me.name || "[your name]",
    me.company && !me.name.toLowerCase().includes(me.company.toLowerCase()) ? me.company : "",
    "",
    me.address ? me.address : "[your postal address — required by US law]",
    "If you'd rather not hear from me, just reply “no”.",
  ];
  const subject = top
    ? ({
        no_website: `question about ${biz}`,
        facebook_only: `${biz} on Google`,
        site_broken: `your website`,
        site_unreachable: `your website`,
        not_mobile: `${biz} on phones`,
        missed_leads: `after-hours calls`,
        no_booking: `booking for ${biz}`,
        few_reviews: `${biz} reviews`,
        low_rating: `${biz} reviews`,
        launch: `${biz}`,
      } as Record<string, string>)[top.key] ?? `quick question about ${biz}`
    : `quick question about ${biz}`;
  return { subject, body: lines.join("\n").replace(/\n{3,}/g, "\n\n") };
}

export const gmailLink = (to: string, subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export const describe = (lead: Lead) =>
  [lead.kind === "business" ? nicheLabel(lead.niche) : lead.category, [lead.city, lead.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
