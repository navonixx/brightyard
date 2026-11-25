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
ALTER TABLE so_posts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'feed';
ALTER TABLE so_posts ADD COLUMN IF NOT EXISTS video_id int;
CREATE TABLE IF NOT EXISTS so_videos (
  id serial PRIMARY KEY,
  status text NOT NULL DEFAULT 'idea',
  format text NOT NULL DEFAULT 'reel',
  pillar text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  hook text NOT NULL DEFAULT '',
  cta text NOT NULL DEFAULT '',
  prompt text NOT NULL DEFAULT '',
  image_src text,
  duration int NOT NULL DEFAULT 8,
  model text,
  caption text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  cover_text text NOT NULL DEFAULT '',
  thumb_prompt text NOT NULL DEFAULT '',
  slides jsonb NOT NULL DEFAULT '[]',
  yt_title text NOT NULL DEFAULT '',
  yt_description text NOT NULL DEFAULT '',
  yt_tags text NOT NULL DEFAULT '',
  ml_id text,
  ml_fetch text,
  raw_url text,
  video_url text,
  final_url text,
  cover_url text,
  thumb_url text,
  media jsonb NOT NULL DEFAULT '[]',
  cost numeric NOT NULL DEFAULT 0,
  tries int NOT NULL DEFAULT 0,
  error text,
  scheduled_for timestamptz,
  youtube_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS so_videos_status ON so_videos (status);
ALTER TABLE so_videos ADD COLUMN IF NOT EXISTS not_before timestamptz;
ALTER TABLE so_videos ADD COLUMN IF NOT EXISTS scenes jsonb NOT NULL DEFAULT '[]';
ALTER TABLE so_videos ADD COLUMN IF NOT EXISTS music_mood text;
ALTER TABLE so_videos ADD COLUMN IF NOT EXISTS music_url text;
ALTER TABLE so_videos ADD COLUMN IF NOT EXISTS slot timestamptz;
ALTER TABLE so_videos ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;
ALTER TABLE so_posts ADD COLUMN IF NOT EXISTS metrics jsonb;
ALTER TABLE so_posts ADD COLUMN IF NOT EXISTS metrics_at timestamptz;
CREATE TABLE IF NOT EXISTS so_music (
  id serial PRIMARY KEY,
  mood text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  url text,
  fetch_url text,
  error text,
  used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS so_stats (
  day date PRIMARY KEY,
  followers int,
  media int,
  raw jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
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
  kind?: "feed" | "story";
  video_id?: number | null;
  results: Record<string, { id?: string; url?: string; at?: string; manual?: boolean }>;
  error: string | null;
  created_at: Date | string;
};

export const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube Shorts" },
] as const;
