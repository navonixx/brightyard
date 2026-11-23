import type { Lead } from "./leads";
import { nicheLabel } from "./niches";

export type Sender = { name: string; company: string; address: string; site: string };

/**
 * A short, specific first email built only from facts we found about the lead:
 * their biggest problem, why it costs them customers, and one free offer.
 * Includes the sender's postal address and an opt-out line (US CAN-SPAM).
 */
export function draftEmail(lead: Lead, me: Sender): { subject: string; body: string } {
  const pains = lead.pain_signals ?? [];
  const top = pains[0];
  const second = pains[1];
  const first = (lead.extra?.people as string[] | undefined)?.[0]?.split(" ")[0];
  const hi = first ? `Hi ${first},` : "Hi there,";
  const biz = lead.name;
  const kind = lead.kind === "creator" ? "channel" : "business";

  const lines: string[] = [hi, ""];
  if (!top) {
    lines.push(`I came across ${biz} and had a couple of ideas that could bring you more ${lead.kind === "creator" ? "sponsors and fans" : "customers"}.`);
  } else {
    const why: Record<string, string> = {
      no_website: "most people check a website before they call, so without one they often pick a competitor who has one",
      facebook_only: "most people search Google before they call, and a Facebook page alone rarely shows up there",
      site_broken: "visitors who hit an error usually leave and call the next result",
      not_mobile: "most visitors are on their phone, and a site that doesn't fit the screen makes them leave",
      no_https: "browsers show a “Not secure” warning, which scares visitors off",
      stale: "an old date makes visitors wonder whether you're still open",
      slow: "visitors usually leave after about three seconds",
      missed_leads: "anyone who finds you after hours, or while you're busy, has no way to reach you except leaving",
      no_booking: "people who want to book right now often can't, and move on",
      few_reviews: "people compare reviews before choosing, and competitors with more reviews win the click",
      low_rating: "people compare ratings before choosing, so it costs you calls every week",
      launch: "a new company is judged first by its website and Google presence",
    };
    lines.push(`I was looking at ${biz} and noticed one thing that's probably costing you ${lead.kind === "creator" ? "opportunities" : "customers"}: ${lowerFirst(top.label)}.`);
    if (why[top.key]) lines.push(`That matters because ${why[top.key]}.`);
    if (second) lines.push(`I also noticed: ${lowerFirst(second.label)}.`);
  }
  lines.push(
    "",
    top?.solution
      ? `We can fix this with ${lowerFirst(top.solution)} — and we do the first piece free, so you can see the result before deciding anything. If it helps, you pay what you feel it's worth.`
      : "We do the first piece of work free, so you can see the result before deciding anything.",
    "",
    `Would it be OK if I put together a quick free example for your ${kind}?`,
    "",
    "Thanks,",
    me.name || "[your name]",
    [me.company, me.site].filter(Boolean).join(" · "),
    "",
    "—",
    me.address ? me.address : "[your postal address — required by US law]",
    "Not interested? Just reply “no thanks” and I won't email again.",
  );

  const subject = top
    ? {
        no_website: `${biz} — a website idea`,
        facebook_only: `${biz} on Google`,
        site_broken: `Quick heads-up about ${lead.domain ?? "your website"}`,
        not_mobile: `${biz} on phones`,
        missed_leads: `After-hours calls for ${biz}`,
        few_reviews: `${biz} reviews`,
        low_rating: `${biz} reviews`,
        launch: `Congrats on the launch, ${biz}`,
      }[top.key] ?? `Quick idea for ${biz}`
    : `Quick idea for ${biz}`;
  return { subject, body: lines.join("\n") };
}

export const gmailLink = (to: string, subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export const describe = (lead: Lead) =>
  [lead.kind === "business" ? nicheLabel(lead.niche) : lead.category, [lead.city, lead.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
