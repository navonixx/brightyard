# Brightyard

Agency site + admin workspace for selling websites to US home-service businesses
(landscapers, painters, cleaners, handymen, pressure washers).

**Offer:** we build a homepage preview for the business first, email them their personal
link, and they pay what they think it's worth to put it live.

## What's inside

| Area | URL | What it does |
|---|---|---|
| Public site | `/` | Landing page, example previews, "get my free preview" form (creates an inbound lead) |
| Demos | `/demo/[slug]` | Three fictional example sites |
| Prospect preview | `/p/[token]` | Personal site for one lead. Tracks opens, "Make it live" (pay-what-you-want) and "Not for me" (opt-out) |
| Admin | `/admin` | Dashboard ($ goal, funnel, who opened their preview), 30-day guide, leads, workspace, outreach CSV, settings |

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/admin. The password is `ADMIN_PASSWORD` in `.env.local`.

Without `DATABASE_URL` the app uses an embedded Postgres (PGlite) stored in `./.data`.
Every integration is optional locally. Without its key, the app falls back to templates,
manual entry or pasted URLs.

## Environment

See `.env.example`. On Vercel, add the same keys under **Settings → Environment Variables**.
`DATABASE_URL` is required there. Tables are created automatically on first request.

| Key | Used for |
|---|---|
| `ADMIN_PASSWORD`, `SESSION_SECRET` | Admin login |
| `NEXT_PUBLIC_SITE_URL` | Links inside emails |
| `DATABASE_URL` | Postgres (Neon / Supabase) |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | Homepage copy and email drafts — preferred when set (default `claude-opus-5-5`, low effort, server-side refusal fallback on) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Used for copy and drafts when no Claude key is set (default `gpt-5.4-mini`, low reasoning effort) |
| `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | Image uploads |
| `GOOGLE_PLACES_API_KEY` | Lead finder |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Phone alerts for opens, claims, opt-outs, inbound requests |

## Stack

Next.js 16.4 (App Router, Cache Components, `proxy.ts`), React 19, Tailwind CSS 4,
Drizzle ORM (postgres.js or PGlite), Anthropic and OpenAI TypeScript SDKs, Zod 4.
