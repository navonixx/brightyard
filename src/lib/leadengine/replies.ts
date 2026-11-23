import type { Lead } from "./leads";
import type { Sender } from "./outreach";

export type Reply = { when: string; text: string };

const footer = (me: Sender) => ["", "Thanks,", me.name || "[your name]"].join("\n");

/**
 * Ready answers for the replies cold emails usually get. Once they've replied, a link is fine
 * (the conversation is established), so the preview link goes in where it helps.
 */
export function replyTemplates(lead: Lead, preview: string | null, me: Sender): Reply[] {
  const link = preview ?? "[press “Build preview” above first — the link appears here]";
  const top = lead.pain_signals?.[0]?.label?.toLowerCase().replace(/\s*—.*$/, "") ?? "a few things on your website";
  return [
    {
      when: "“Yes, send it” / “Sure”",
      text: [`Great — here it is: ${link}`, "", `It's a working homepage for ${lead.name}, built around what you already offer. Have a look on your phone too.`, "If you like it, I can put it live on your own domain. If you'd change anything, just tell me what.", footer(me)].join("\n"),
    },
    {
      when: "“How much does it cost?”",
      text: ["Good question. There's no set price — the first project is on us, so you only decide after you've seen it working.", "If it helps your business, you pay what you feel it's worth; most owners choose somewhere between $99 and $199 to have it live on their domain. No contract, no monthly fee unless you want us to look after it.", "", `Here's the preview so you can judge it first: ${link}`, footer(me)].join("\n"),
    },
    {
      when: "“Who are you?” / “Is this a scam?”",
      text: ["Fair to ask! I'm with Alderwell Creative, a small studio that builds websites and marketing for local businesses.", `I noticed ${top}, so I made a preview first instead of asking you to pay for anything: ${link}`, "Nothing is charged unless you decide you want it live — no card needed.", footer(me)].join("\n"),
    },
    {
      when: "“We already have someone” / “We're happy with our site”",
      text: ["Totally understand — thanks for letting me know.", `If it's useful, feel free to pass this preview to whoever looks after your site; they're welcome to use any ideas from it: ${link}`, "All the best with the business!", footer(me)].join("\n"),
    },
    {
      when: "“Not right now” / “Maybe later”",
      text: ["No problem at all. I'll leave it with you.", `The preview stays up here whenever you'd like to look: ${link}`, "Just reply to this email if the timing gets better.", footer(me)].join("\n"),
    },
    {
      when: "“No” / “Unsubscribe” / “Stop”",
      text: ["Understood — I won't contact you again. Sorry for the interruption, and all the best.", footer(me)].join("\n"),
    },
  ];
}

/** Short follow-ups for leads that haven't replied (day 3 and day 7). */
export function followUpDraft(lead: Lead, step: 1 | 2, me: Sender): { subject: string; body: string } {
  const top = lead.pain_signals?.[0]?.label?.toLowerCase().replace(/\s*—.*$/, "") ?? "a few things on your website";
  const body =
    step === 1
      ? ["Hi,", "", `Just bumping this up in case it got buried — happy to send over the quick idea for ${lead.name}. Want me to?`]
      : ["Hi,", "", `Last note from me. If fixing ${top} is ever on your list, just reply and I'll send the idea over.`, "If not, no worries at all — I won't follow up again."];
  return {
    subject: `Re: ${lead.name}`,
    body: [...body, "", "Thanks,", me.name || "[your name]", "", me.address || "[your postal address]", "If you'd rather not hear from me, just reply “no”."].join("\n"),
  };
}
