import "server-only";
import { q } from "./db";

/**
 * Sends from the studio's own Gmail over SMTP with an App Password (Gmail → Security →
 * 2-Step Verification → App passwords). Messages are plain text, land in Gmail's Sent folder,
 * and replies come back to the same inbox. GMAIL_USER + GMAIL_APP_PASSWORD live in the env.
 */
export function mailReady() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendMail(opts: { to: string; subject: string; text: string; fromName: string; inReplyTo?: string | null }): Promise<string> {
  if (!mailReady()) throw new Error("Gmail sending isn't set up yet (GMAIL_USER / GMAIL_APP_PASSWORD).");
  const nodemailer = (await import("nodemailer")).default;
  const user = process.env.GMAIL_USER!;
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
    connectionTimeout: 15_000,
    socketTimeout: 20_000,
  });
  try {
    const info = await transport.sendMail({
      from: { name: opts.fromName || "Alderwell Creative", address: user },
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      inReplyTo: opts.inReplyTo ?? undefined,
      references: opts.inReplyTo ? [opts.inReplyTo] : undefined,
      headers: { "List-Unsubscribe": `<mailto:${user}?subject=unsubscribe>` },
    });
    return info.messageId;
  } finally {
    transport.close();
  }
}

/** Emails sent today (all Lead Engine emails count: first emails + follow-ups). */
export async function sentToday(): Promise<number> {
  const [row] = await q<{ n: number }>(
    `SELECT (SELECT count(*) FROM le_leads WHERE contacted_at >= date_trunc('day', now()))
          + (SELECT count(*) FROM le_leads WHERE (extra->>'lastFollowUp')::timestamptz >= date_trunc('day', now())) AS n`,
  );
  return Number(row?.n ?? 0);
}

/**
 * Reads the Gmail inbox (last 21 days) and marks every lead that wrote back as "replied",
 * saving the first lines of their reply. Replies saying stop/unsubscribe are marked "lost".
 */
export async function checkReplies(): Promise<{ checked: number; replied: string[]; stopped: string[] }> {
  if (!mailReady()) throw new Error("Gmail isn't connected yet.");
  const contacted = await q<{ id: number; email: string; lead_id: string | null; name: string }>(
    "SELECT id, lower(email) AS email, lead_id, name FROM le_leads WHERE status = 'contacted' AND email IS NOT NULL",
  );
  if (!contacted.length) return { checked: 0, replied: [], stopped: [] };
  const byEmail = new Map(contacted.map((c) => [c.email, c]));

  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
    logger: false,
  });
  const found = new Map<string, string>();
  let checked = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 21 * 86_400_000);
      for await (const msg of client.fetch({ since }, { envelope: true, source: { start: 0, maxLength: 4000 } })) {
        checked++;
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase();
        if (!from || !byEmail.has(from) || found.has(from)) continue;
        const raw = msg.source?.toString("utf8") ?? "";
        const body = raw.split(/\r?\n\r?\n/).slice(1).join("\n").replace(/=\r?\n/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        found.set(from, (msg.envelope?.subject ? `${msg.envelope.subject}: ` : "") + body.slice(0, 280));
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  const replied: string[] = [];
  const stopped: string[] = [];
  for (const [email, snippet] of found) {
    const lead = byEmail.get(email)!;
    const stop = /\b(unsubscribe|stop|remove me|not interested|no thanks|don'?t (email|contact))\b/i.test(snippet);
    await q(
      `UPDATE le_leads SET status = $2, extra = extra || jsonb_build_object('reply', $3::text, 'repliedAt', now()), updated_at = now() WHERE id = $1`,
      [lead.id, stop ? "lost" : "replied", snippet],
    );
    if (lead.lead_id) await q("UPDATE leads SET status = $2, updated_at = now() WHERE id = $1 AND status <> 'opted_out'", [lead.lead_id, stop ? "opted_out" : "interested"]);
    (stop ? stopped : replied).push(lead.name);
  }
  return { checked, replied, stopped };
}
