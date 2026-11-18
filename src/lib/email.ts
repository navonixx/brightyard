import type { AppSettings } from "./data";

/** CAN-SPAM footer: real sender, physical address and a clear way to opt out. */
export function emailFooter(settings: AppSettings): string {
  const lines = [settings.senderName || "{your name}", `Brightyard · ${settings.businessAddress || "{business address}"}`];
  return `${lines.join("\n")}\n\nNot interested? Reply "no" and I won't email again.`;
}

export function composeEmail(body: string | null, settings: AppSettings): string {
  return `${(body ?? "").trim()}\n\n${emailFooter(settings)}`;
}
