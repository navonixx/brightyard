import "server-only";
import type { NewLead } from "../leads";
import { findEmails, isRealSite } from "../web";

/**
 * YouTube Data API v3 (free: 10,000 units a day; one search = 100 units).
 * Finds US channels for a topic — small businesses, coaches, creators — and reads the
 * website / email / socials they list in their channel description.
 */
export async function runYouTube(params: { query: string; pages?: number }): Promise<{ leads: NewLead[]; note: string }> {
  const key = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("No Google API key in .env.local");
  const ids: string[] = [];
  let token = "";
  for (let page = 0; page < Math.min(4, params.pages ?? 2); page++) {
    const p = new URLSearchParams({ part: "snippet", type: "channel", q: params.query, regionCode: "US", relevanceLanguage: "en", maxResults: "50", key });
    if (token) p.set("pageToken", token);
    const data = (await fetch(`https://www.googleapis.com/youtube/v3/search?${p}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.json())) as {
      error?: { message: string };
      items?: { id: { channelId: string } }[];
      nextPageToken?: string;
    };
    if (data.error) {
      throw new Error(
        /not been used|disabled|Permission denied|blocked/i.test(data.error.message)
          ? "YouTube Data API v3 is not enabled for this Google key — enable it (free) in Google Cloud → APIs & Services → Library"
          : data.error.message,
      );
    }
    ids.push(...(data.items ?? []).map((i) => i.id.channelId));
    token = data.nextPageToken ?? "";
    if (!token) break;
  }

  const leads: NewLead[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const p = new URLSearchParams({ part: "snippet,statistics", id: ids.slice(i, i + 50).join(","), key });
    const data = (await fetch(`https://www.googleapis.com/youtube/v3/channels?${p}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.json())) as {
      items?: { id: string; snippet: { title: string; description: string; customUrl?: string; country?: string }; statistics: { subscriberCount?: string; videoCount?: string; viewCount?: string } }[];
    };
    for (const ch of data.items ?? []) {
      if (ch.snippet.country && ch.snippet.country !== "US") continue;
      const desc = ch.snippet.description ?? "";
      const links = desc.match(/https?:\/\/[^\s)]+/g) ?? [];
      const socials: Record<string, string> = { youtube: `https://www.youtube.com/${ch.snippet.customUrl ?? `channel/${ch.id}`}` };
      for (const l of links) {
        const m = l.match(/(facebook|instagram|tiktok|linkedin|twitter|x)\.com/i);
        if (m) socials[m[1].toLowerCase()] ??= l;
      }
      const website = links.find((l) => isRealSite(l)) ?? null;
      const email = findEmails(desc)[0] ?? null;
      leads.push({
        source: "youtube",
        sourceId: ch.id,
        kind: "creator",
        name: ch.snippet.title,
        category: params.query,
        website,
        email,
        socials,
        extra: {
          subscribers: Number(ch.statistics.subscriberCount ?? 0),
          videos: Number(ch.statistics.videoCount ?? 0),
          views: Number(ch.statistics.viewCount ?? 0),
          hasEmail: Boolean(email),
          about: desc.slice(0, 400),
        },
      });
    }
  }
  return { leads, note: `YouTube: ${ids.length} channels for “${params.query}”` };
}
