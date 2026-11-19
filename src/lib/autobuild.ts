import "server-only";
import { buildFromResearch } from "./ai";
import { siteUrl } from "./brand";
import { getLead, logEvent, updateLead } from "./data";
import { PHOTO_LIBRARY } from "./photos";
import { scoreLead } from "./places";
import { researchSite } from "./research";
import { checkSite } from "./sitecheck";
import { templateEmail } from "./templates";

export type AutoBuildResult = { ok: boolean; message: string };

const isSocial = (url: string) => /facebook\.com|instagram\.com|yelp\.com|linktr\.ee|google\.com/i.test(url);

/**
 * Reads the lead's current website and prepares everything for sending: redesign copy,
 * theme, photos and a personal first email. Never overwrites a name or email already entered.
 */
export async function autoBuildLead(id: string): Promise<AutoBuildResult> {
  const lead = await getLead(id);
  if (!lead) return { ok: false, message: "Lead not found." };
  if (!lead.website || isSocial(lead.website)) {
    return { ok: false, message: "This lead has no website to read. Use Generate copy instead." };
  }

  // Score the current site first (Find & build has usually done this already).
  let siteIssues = lead.siteIssues;
  if (!lead.siteCheckedAt) {
    const check = await checkSite(lead.website);
    siteIssues = check.issues;
    await updateLead(id, { siteScore: check.reachable ? check.score : null, siteIssues: check.issues, siteCheckedAt: new Date() });
  }

  const research = await researchSite(lead.website).catch(() => null);
  if (!research || research.text.length < 200) {
    await logEvent(id, "autobuild_failed", { reason: "site_unreadable" });
    return { ok: false, message: "Couldn't read their website (blocked, down or empty). Build this one by hand." };
  }

  const link = `${siteUrl()}/p/${lead.token}`;
  const built = await buildFromResearch({
    lead,
    siteText: research.text,
    emails: research.emails,
    builder: research.builder,
    siteIssues,
    photoLibrary: PHOTO_LIBRARY,
    link,
  });
  if (!built) {
    return { ok: false, message: "AI is not configured or the call failed. Check the AI key in Settings." };
  }

  const images = [...new Set(built.photos)]
    .filter((key) => key in PHOTO_LIBRARY)
    .slice(0, 4)
    .map((key) => PHOTO_LIBRARY[key]);

  // Only accept an email the page really contained.
  const email =
    lead.email ?? (built.contactEmail && research.emails.includes(built.contactEmail.toLowerCase()) ? built.contactEmail.toLowerCase() : null);
  const ownerName = lead.ownerName ?? built.ownerFirstName;

  // The draft must carry the preview link and the {me} intro; otherwise fall back to the template.
  const draftOk = built.emailBody.includes(link) && built.emailBody.includes("{me}");
  const fallback = templateEmail({ ...lead, ownerName, link });

  const researchNote = [
    `Hook: ${built.hook}`,
    `Weak spot on current site: ${built.weakness}`,
    `Platform: ${research.builder ?? "unknown"} · pages read: ${research.pages}`,
    email ? null : `No email found on their site — use their contact form: ${research.url}`,
  ]
    .filter(Boolean)
    .join("\n");

  await updateLead(id, {
    ownerName,
    email,
    sample: built.sample,
    theme: built.theme,
    images: images.length ? images : lead.images,
    emailSubject: draftOk ? built.emailSubject : fallback.subject,
    emailBody: draftOk ? built.emailBody : fallback.body,
    notes: [lead.notes, `— Auto-research —\n${researchNote}`].filter(Boolean).join("\n\n"),
    status: lead.status === "new" ? "sample_ready" : lead.status,
    score: scoreLead({ ...lead, email }) + 20,
  });
  await logEvent(id, "autobuild", { pages: research.pages, emailFound: Boolean(email), draft: draftOk ? "ai" : "template" });

  return {
    ok: true,
    message: `Built from ${research.pages} page(s) of their site.${email ? "" : " No email found — see notes."} Read everything before sending.`,
  };
}
