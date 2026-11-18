import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __brightyardDb?: Promise<DB> };

/**
 * DATABASE_URL set → real Postgres (Neon, Supabase, …) via postgres.js.
 * Not set        → embedded PGlite stored in ./.data (local development only).
 */
export function getDb(): Promise<DB> {
  globalForDb.__brightyardDb ??= init().catch((error) => {
    globalForDb.__brightyardDb = undefined;
    throw error;
  });
  return globalForDb.__brightyardDb;
}

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { prepare: false, max: 5 });
    await client.unsafe(schema.BOOTSTRAP_SQL);
    return drizzle(client, { schema }) as unknown as DB;
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.");
  }

  const { mkdir } = await import("node:fs/promises");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  await mkdir("./.data", { recursive: true });
  const client = new PGlite("./.data/pglite");
  await client.exec(schema.BOOTSTRAP_SQL);
  return drizzle(client, { schema }) as unknown as DB;
}
