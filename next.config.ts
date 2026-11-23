import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite (local embedded Postgres) ships WASM files; keep it out of the bundle.
  // DuckDB (Lead Engine → Overture Maps) is a native module; also kept out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "@duckdb/node-api"],
  // DuckDB's .node file loads libduckdb.so at runtime, which file tracing can't see — ship it with the Lead Engine routes.
  outputFileTracingIncludes: {
    "/admin/lead-engine": ["./node_modules/@duckdb/node-bindings-linux-x64/**/*"],
    "/admin/lead-engine/**": ["./node_modules/@duckdb/node-bindings-linux-x64/**/*"],
  },
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
