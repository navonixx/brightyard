import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const LEAD_STATUSES = [
  "new",
  "sample_ready",
  "emailed",
  "viewed",
  "interested",
  "won",
  "lost",
  "opted_out",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const TRADES = [
  "landscaping",
  "painting",
  "cleaning",
  "handyman",
  "pressure_washing",
  "other",
] as const;
export type Trade = (typeof TRADES)[number];

export type SampleContent = {
  headline: string;
  subheadline: string;
  services: { title: string; description: string }[];
  whyUs: string[];
  about: string;
  cta: string;
  serviceArea: string;
};

export type LeadImage = { url: string; alt: string };

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name"),
  trade: text("trade").$type<Trade>().notNull().default("other"),
  city: text("city"),
  state: text("state"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  placeId: text("place_id").unique(),
  source: text("source").notNull().default("manual"),
  status: text("status").$type<LeadStatus>().notNull().default("new"),
  score: integer("score").notNull().default(0),
  notes: text("notes"),
  sample: jsonb("sample").$type<SampleContent | null>(),
  images: jsonb("images").$type<LeadImage[]>().notNull().default([]),
  videoUrl: text("video_url"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  offerAmount: integer("offer_amount"),
  paidAmount: integer("paid_amount").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Lead = typeof leads.$inferSelect;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  leadId: text("lead_id"),
  type: text("type").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type LeadEvent = typeof events.$inferSelect;

export const guideProgress = pgTable("guide_progress", {
  stepId: text("step_id").primaryKey(),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("done_at", { withTimezone: true }),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Idempotent bootstrap — keeps the database in sync without a migration step. */
export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  token text NOT NULL UNIQUE,
  business_name text NOT NULL,
  owner_name text,
  trade text NOT NULL DEFAULT 'other',
  city text,
  state text,
  email text,
  phone text,
  website text,
  rating real,
  review_count integer,
  place_id text UNIQUE,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'new',
  score integer NOT NULL DEFAULT 0,
  notes text,
  sample jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  email_subject text,
  email_body text,
  offer_amount integer,
  paid_amount integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE TABLE IF NOT EXISTS events (
  id serial PRIMARY KEY,
  lead_id text,
  type text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_lead_idx ON events (lead_id);
CREATE TABLE IF NOT EXISTS guide_progress (
  step_id text PRIMARY KEY,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz
);
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
`;
