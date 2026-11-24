import "server-only";
import { sq } from "./db";

const GRAPH = "https://graph.facebook.com/v21.0";

type PageRow = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };

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
  const token = String(long.access_token);
  const FIELDS = "id,name,access_token,instagram_business_account{id,username}";
  const accounts = (await get("me/accounts", { fields: FIELDS, access_token: token })) as { data?: PageRow[] };
  let pages = accounts.data ?? [];

  // Pages reached through a Business portfolio (or ticked one by one in the popup) don't always
  // show in /me/accounts. The token's own grant list names the Page ids, so fetch them directly.
  const debug = (await get("debug_token", { input_token: token, access_token: `${appId}|${appSecret}` }).catch(() => ({}))) as {
    data?: { scopes?: string[]; granular_scopes?: { scope: string; target_ids?: string[] }[] };
  };
  const scopes = debug.data?.scopes ?? [];
  if (!pages.length) {
    const ids = new Set((debug.data?.granular_scopes ?? []).filter((g) => g.scope.startsWith("pages_")).flatMap((g) => g.target_ids ?? []));
    for (const id of ids) {
      const p = (await get(id, { fields: FIELDS, access_token: token }).catch(() => null)) as PageRow | null;
      if (p?.access_token) pages.push(p);
    }
    pages = pages.filter((p, i) => pages.findIndex((x) => x.id === p.id) === i);
  }
  if (!pages.length) {
    const need = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "business_management"];
    const missing = need.filter((s) => !scopes.includes(s));
    throw new Error(
      missing.length
        ? `Token mein ye permission nahi hai: ${missing.join(", ")}. Graph API Explorer mein inhe add karo, phir Generate Access Token → popup mein Page aur Instagram par tick → naya token paste karo.`
        : "Token sahi hai, par isme koi Page nahi chuna gaya. Graph API Explorer → Generate Access Token → popup mein “Edit previous settings” / “Opt in to all current and future Pages” → Alderwell Creative Page par tick → Save → naya token paste karo. Ye bhi check karo ki Explorer mein wahi Facebook profile logged in hai jo Page ki admin hai.",
    );
  }
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
  // Posting needs these; a token can connect without them (it then fails at publish time).
  const needed = ["pages_manage_posts", "instagram_basic", "instagram_content_publish"];
  const missing = scopes.length ? needed.filter((n) => !scopes.includes(n)) : [];
  return { page: page.name, instagram: ig.username ?? ig.id, missing };
}

export async function disconnectMeta() {
  await sq("DELETE FROM so_settings WHERE key LIKE 'meta_%'");
}
