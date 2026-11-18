import type { AppSettings } from "./data";

/** CAN-SPAM footer: real sender, physical address and a clear way to opt out. */
export function emailFooter(settings: AppSettings): string {
  const lines = [settings.senderName || "{your name}", `Brightyard · ${settings.businessAddress || "{business address}"}`];
  return `${lines.join("\n")}\n\nNot interested? Reply "no" and I won't email again.`;
}

export function composeEmail(body: string | null, settings: AppSettings): string {
  return `${(body ?? "").trim()}\n\n${emailFooter(settings)}`;
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
