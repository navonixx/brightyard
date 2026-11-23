import "server-only";
import { autoBuildLead } from "@/lib/autobuild";
import { generateSample } from "@/lib/ai";
import { siteUrl } from "@/lib/brand";
import { getLead as getMainLead, logEvent, updateLead } from "@/lib/data";
import { getLead } from "./leads";
import { sendToLeads } from "./promote";

/**
 * One click: copies the Lead Engine lead into the main Leads list (if it isn't there yet) and
 * builds its free website preview with the app's existing builders — a redesign from their
 * current site when it can be read, otherwise fresh homepage copy. Returns the preview link.
 */
export async function buildPreview(id: number): Promise<{ ok: boolean; message: string; url?: string; leadId?: string }> {
  let le = await getLead(id);
  if (!le) return { ok: false, message: "Lead not found." };
  if (!le.lead_id) {
    await sendToLeads([id]);
    le = await getLead(id);
  }
  const leadId = le?.lead_id;
  const main = leadId ? await getMainLead(leadId) : undefined;
  if (!leadId || !main) return { ok: false, message: "Couldn't add this lead to Leads." };

  const url = `${siteUrl()}/p/${main.token}`;
  if (main.sample) return { ok: true, message: "Preview is ready.", url, leadId };

  if (main.website) {
    const built = await autoBuildLead(leadId).catch(() => ({ ok: false, message: "" }));
    if (built.ok) return { ok: true, message: "Preview built from their current website — read it once before sending.", url, leadId };
  }
  // No website (or it couldn't be read): write fresh homepage copy instead.
  const { sample, source } = await generateSample(main);
  await updateLead(leadId, { sample, status: main.status === "new" ? "sample_ready" : main.status });
  await logEvent(leadId, "sample_generated", { source, from: "leadengine" });
  return { ok: true, message: source === "ai" ? "Preview written — read it once before sending." : "Preview made from a template (AI unavailable) — check it before sending.", url, leadId };
}

/** Preview link for a Lead Engine lead that is already in Leads with a built sample. */
export async function previewUrlFor(leadId: string | null): Promise<string | null> {
  if (!leadId) return null;
  const main = await getMainLead(leadId);
  return main?.sample ? `${siteUrl()}/p/${main.token}` : null;
}
