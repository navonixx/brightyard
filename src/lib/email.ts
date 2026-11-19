import type { AppSettings } from "./data";
import { siteUrl } from "./brand";

/** "Ethan from Alderwell Creative" → "Kunj". Used for the "I'm {me}" intro line. */
function firstName(settings: AppSettings): string {
  return settings.senderName.trim().split(/\s+/)[0] ?? "";
}

/** Signature + CAN-SPAM footer: real sender, a site to verify us, postal address, opt-out. */
export function emailFooter(settings: AppSettings): string {
  const lines = [
    firstName(settings) || "{your name}",
    `Alderwell Creative — websites for local businesses`,
    siteUrl().replace(/^https?:\/\//, ""),
    settings.businessAddress || "{business address}",
  ];
  return `${lines.join("\n")}\n\nNot interested? Reply "no" and I won't email again.`;
}

/** Final email text: fills the {me} placeholder and appends the footer. */
export function composeEmail(body: string | null, settings: AppSettings): string {
  const text = (body ?? "").trim().replaceAll("{me}", firstName(settings) || "{your name}");
  return `${text}\n\n${emailFooter(settings)}`.trim();
}

/** Gmail web compose link with everything prefilled. `account` picks the right signed-in Gmail. */
export function gmailComposeUrl({
  to,
  subject,
  body,
  account,
}: {
  to: string;
  subject: string;
  body: string;
  account?: string;
}): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  if (account) params.set("authuser", account);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Short follow-up text, chosen by whether they opened the preview. Footer is added by composeEmail. */
export function followUpBody(input: { ownerName: string | null; viewCount: number; step: 1 | 2; link: string }): string {
  const hi = input.ownerName ? `Hi ${input.ownerName.split(" ")[0]},` : "Hi,";
  if (input.step === 2) {
    return `${hi}\n\nLast note from me. The new version of your site stays up for another week if you want a look:\n\n${input.link}\n\nEither way, good luck with the season.`;
  }
  if (input.viewCount > 0) {
    return `${hi}\n\nI saw the redesign got a look. Is there anything you'd want different? Happy to change it, and your own photos can go in whenever you like.\n\n${input.link}`;
  }
  return `${hi}\n\nJust making sure this didn't get buried. The new version of your site is here:\n\n${input.link}\n\nIt's free to look at, and I'm happy to change anything.`;
}
