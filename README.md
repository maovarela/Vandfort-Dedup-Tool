# VANDFORT Dedup Engine

Client-side CRM deduplication tool for Vandfort RevOps engagements.

Connects to HubSpot or Salesforce, scans for duplicate Companies and Contacts,
and lets an operator review and merge them — all inside the browser.

**Zero server storage of client data.**

---

## Security model

- CRM records never leave the client's browser to any Vandfort infrastructure
- OAuth tokens stored in `sessionStorage` only — cleared on tab close
- HubSpot OAuth proxied through a stateless Cloudflare Worker (client_secret hidden)
- Salesforce uses PKCE — no Worker, no client_secret in browser
- Claude API calls proxied through a stateless Worker with no request body logging
- Anonymized benchmark metrics only go to Cloudflare D1 (opt-in)

## Stack

| Layer | Choice |
|---|---|
| Hosting | Cloudflare Pages (static export) |
| Framework | Next.js 14, `output: 'export'` |
| UI | Tailwind CSS + shadcn/ui + Lucide |
| Match engine | TypeScript Web Worker (fastest-levenshtein, custom fuzzy) |
| Local state | IndexedDB via `idb` |
| Auth | HubSpot OAuth via Worker proxy / Salesforce PKCE |
| AI edge cases | Claude Haiku via stateless Worker proxy |
| PDF export | jsPDF (client-side, Audit mode) |
| Workers | Cloudflare Workers (oauth-proxy, claude-proxy) |
| Benchmarks | Cloudflare D1 (anonymized only) |

## Setup

```bash
cp .env.example .env.local
# Fill in HubSpot Client ID, Salesforce Client ID
# Deploy Workers first, then update proxy URLs

npm install
npm run dev
```

## Deploy

```bash
# 1. Deploy Workers
wrangler deploy --config wrangler.toml

# 2. Set Worker secrets (never in env files)
wrangler secret put HUBSPOT_CLIENT_SECRET --name oauth-proxy
wrangler secret put ANTHROPIC_API_KEY --name claude-proxy

# 3. Create D1 benchmark database
wrangler d1 create vandfort-benchmarks
# Copy the database_id into wrangler.toml

# 4. Deploy Pages
npm run build
wrangler pages deploy out --project-name vandfort-dedup
```

## Structure

See `CLAUDE.md` for full build instructions, session plan, and implementation notes.

---

*Internal tool — Vandfort confidential.*
