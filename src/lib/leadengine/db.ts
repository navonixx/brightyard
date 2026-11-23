import "server-only";
import { getDb } from "@/lib/db";

/**
 * Lead Engine keeps its data in its own tables (le_*) inside the app's database,
 * so the existing Leads / Lead Database tables are never touched.
 */
const BOOTSTRAP = `
CREATE TABLE IF NOT EXISTS le_leads (
  id serial PRIMARY KEY,
  source text NOT NULL,
  source_id text NOT NULL,
  sources text[] NOT NULL DEFAULT '{}',
  kind text NOT NULL DEFAULT 'business',
  name text NOT NULL,
  name_key text,
  niche text,
  category text,
  city text,
  state text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  phone_key text,
  website text,
  domain text,
  email text,
  emails jsonb NOT NULL DEFAULT '[]',
  socials jsonb NOT NULL DEFAULT '{}',
  rating real,
  review_count integer,
  extra jsonb NOT NULL DEFAULT '{}',
  enrich_status text NOT NULL DEFAULT 'pending',
  claimed_at timestamptz,
  enriched_at timestamptz,
  pay_score integer NOT NULL DEFAULT 0,
  pain_score integer NOT NULL DEFAULT 0,
  pay_signals jsonb NOT NULL DEFAULT '[]',
  pain_signals jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'new',
  notes text,
  follow_up date,
  contacted_at timestamptz,
  lead_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS le_leads_domain ON le_leads (domain);
CREATE INDEX IF NOT EXISTS le_leads_phone ON le_leads (phone_key);
CREATE INDEX IF NOT EXISTS le_leads_enrich ON le_leads (enrich_status);
CREATE INDEX IF NOT EXISTS le_leads_city ON le_leads (state, city);
CREATE INDEX IF NOT EXISTS le_leads_name ON le_leads (name_key, state);
CREATE TABLE IF NOT EXISTS le_jobs (
  id serial PRIMARY KEY,
  source text NOT NULL,
  label text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued',
  found integer NOT NULL DEFAULT 0,
  added integer NOT NULL DEFAULT 0,
  merged integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS le_settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS le_geo (key text PRIMARY KEY, bbox jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS le_log (id serial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), text text NOT NULL);
`;

type Client = { unsafe?: (sql: string, params?: unknown[]) => Promise<unknown[]>; query?: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>; exec?: (sql: string) => Promise<unknown> };
const g = globalThis as unknown as { __leClient?: Promise<Client> };

function client(): Promise<Client> {
  g.__leClient ??= (async () => {
    const db = (await getDb()) as unknown as { $client: Client };
    const c = db.$client;
    if (c.unsafe) await c.unsafe(BOOTSTRAP);
    else await c.exec!(BOOTSTRAP);
    return c;
  })().catch((e) => {
    g.__leClient = undefined;
    throw e;
  });
  return g.__leClient;
}

/** Parameterised SQL → rows. Works on both Postgres (postgres.js) and local PGlite. */
export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = await client();
  if (c.unsafe) return (await c.unsafe(sql, params as never[])) as T[];
  return (await c.query!(sql, params)).rows as T[];
}

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(sql, params))[0] ?? null;
}

/** Postgres array literal for int[] / text[] parameters (portable across both drivers). */
export const pgArray = (values: (string | number)[]) => `{${values.map((v) => (typeof v === "number" ? v : `"${String(v).replace(/["\\]/g, "\\$&")}"`)).join(",")}}`;

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await one<{ value: string }>("SELECT value FROM le_settings WHERE key = $1", [key]);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await q("INSERT INTO le_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
}

export async function bump(key: string, by = 1): Promise<number> {
  const row = await one<{ value: string }>(
    `INSERT INTO le_settings (key, value) VALUES ($1, $2::text) ON CONFLICT (key)
     DO UPDATE SET value = (le_settings.value::int + $2::int)::text RETURNING value`,
    [key, String(by)],
  );
  return Number(row?.value ?? by);
}

export async function log(text: string) {
  await q("INSERT INTO le_log (text) VALUES ($1)", [text.slice(0, 500)]);
  await q("DELETE FROM le_log WHERE id < (SELECT max(id) - 300 FROM le_log)");
}

export const month = () => new Date().toISOString().slice(0, 7);
