import "server-only";
import { sq } from "./db";

const GRAPH = "https://graph.facebook.com/v21.0";

async function get(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  const data = (await res.json()) as Record<string, unknown> & { error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data;
}

/**
 * Turns the short-lived user token from Graph API Explorer into a Page token that doesn't
 * expire (exchange → long-lived user token → /me/accounts), finds the Alderwell Page and its
 * Instagram Business account, and saves them. The app secret is used once and not stored.
 */
export async function connectMeta(appId: string, appSecret: string, userToken: string) {
  const long = await get("oauth/access_token", { grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: userToken });
  const accounts = (await get("me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: String(long.access_token),
  })) as { data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[] };
  const pages = accounts.data ?? [];
  if (!pages.length) throw new Error("No Facebook Page found — when generating the token, tick your Page and allow pages_show_list.");
  const page = pages.find((p) => /alderwell/i.test(p.name)) ?? pages[0];
  const ig = page.instagram_business_account;
  if (!ig?.id) throw new Error(`The Page “${page.name}” has no Instagram Business account linked — link them in Instagram → Settings → Accounts Center, then try again.`);
  const values: Record<string, string> = {
    meta_page_token: page.access_token,
    meta_page_id: page.id,
    meta_page_name: page.name,
    meta_ig_user_id: ig.id,
    meta_ig_username: ig.username ?? "",
    meta_connected_at: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(values)) {
    await sq("INSERT INTO so_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
  }
  return { page: page.name, instagram: ig.username ?? ig.id };
}

export async function disconnectMeta() {
  await sq("DELETE FROM so_settings WHERE key LIKE 'meta_%'");
}
