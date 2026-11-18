import type { AppSettings } from "./data";
import { siteUrl } from "./brand";

/** "Kunj from Brightyard" → "Kunj". Used for the "I'm {me}" intro line. */
function firstName(settings: AppSettings): string {
  return settings.senderName.trim().split(/\s+/)[0] ?? "";
}

/** Signature + CAN-SPAM footer: real sender, a site to verify us, postal address, opt-out. */
export function emailFooter(settings: AppSettings): string {
  const lines = [
    firstName(settings) || "{your name}",
    `Brightyard — websites for local businesses`,
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
