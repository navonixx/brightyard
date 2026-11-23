import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite (local embedded Postgres) ships WASM files; keep it out of the bundle.
  // DuckDB (Lead Engine → Overture Maps) is a native module; also kept out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "@duckdb/node-api"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
