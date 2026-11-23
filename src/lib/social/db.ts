import "server-only";
import { q } from "@/lib/leadengine/db";

/** Social module tables (so_*), created on first use. Existing tables are never touched. */
const BOOTSTRAP = `
CREATE TABLE IF NOT EXISTS so_posts (
  id serial PRIMARY KEY,
  idea text,
  caption text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  assets jsonb NOT NULL DEFAULT '[]',
  platforms text[] NOT NULL DEFAULT '{instagram,facebook}',
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft',
  results jsonb NOT NULL DEFAULT '{}',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS so_posts_when ON so_posts (status, scheduled_for);
CREATE TABLE IF NOT EXISTS so_settings (key text PRIMARY KEY, value text NOT NULL);
`;

const g = globalThis as unknown as { __soReady?: Promise<void> };

export async function sq<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  g.__soReady ??= (async () => {
    for (const stmt of BOOTSTRAP.split(";").map((s) => s.trim()).filter(Boolean)) await q(stmt);
  })().catch((e) => {
    g.__soReady = undefined;
    throw e;
  });
  await g.__soReady;
  return q<T>(sql, params);
}

export type Asset = { src: string; kind: "image" | "video"; poster?: string; label: string };
export type Post = {
  id: number;
  idea: string | null;
  caption: string;
  hashtags: string;
  assets: Asset[];
  platforms: string[];
  scheduled_for: Date | string | null;
  status: "draft" | "approved" | "posted" | "failed";
  results: Record<string, { id?: string; url?: string; at?: string; manual?: boolean }>;
  error: string | null;
  created_at: Date | string;
};

export const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube Shorts" },
] as const;
