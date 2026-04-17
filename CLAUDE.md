# VANDFORT Dedup Engine — Claude Code Instructions

## What you are building

A client-side CRM deduplication tool for Vandfort, an AI-native RevOps consulting firm.
It connects to HubSpot or Salesforce, scans for duplicate Companies and Contacts,
and lets an operator review and merge them — all inside the browser.

**Zero server storage of client data. Everything runs in the browser.**

---

## Security model — never violate these rules

1. CRM records never leave the client's browser to any Vandfort infrastructure
2. OAuth tokens stored in `sessionStorage` only — never `localStorage`, never a server
3. HubSpot OAuth proxied through a stateless Cloudflare Worker (client_secret hidden) — Worker logs NO request bodies
4. Salesforce uses PKCE — no Worker needed, no client_secret in browser
5. Claude API calls proxied through a stateless Cloudflare Worker — no request body logging
6. Anonymized benchmark metrics only go to Cloudflare D1 (opt-in, post-scan) — no record content, no client identifiers
7. IndexedDB holds scan state in-browser only — explicit user-controlled clear button in UI
8. CSP headers restrict outbound connections to: HubSpot API, Salesforce API, Vandfort Worker domains only

If any code you write would send record-level data to a Vandfort server, stop and redesign it.

---

## Architecture

```
Browser (Cloudflare Pages — Next.js static export)
  ├── Next.js 14, output: 'export', App Router
  ├── Tailwind CSS + shadcn/ui + Lucide icons
  ├── Web Worker — match engine (runs off main thread)
  ├── IndexedDB (idb library) — scan state, merge log, Claude cache
  ├── sessionStorage — OAuth tokens only
  └── Direct API calls to HubSpot / Salesforce

Cloudflare Workers (stateless, zero body logging)
  ├── oauth-proxy — HubSpot token exchange (holds client_secret)
  └── claude-proxy — forwards prompts to Anthropic API

Cloudflare D1 (anonymized benchmarks only)
  └── Schema: industry, arr_band, crm_age_months, record_count_rounded,
              duplicate_rate, confidence_distribution, crm_type
      NO client names, NO record content, NO identifiers
```

---

## Brand tokens

```css
--bg:            #0D0D0D;
--surface:       #141414;
--surface-2:     #1A1A1A;
--border:        #252525;
--border-hover:  #333333;
--accent:        #C6F135;   /* electric lime */
--accent-dim:    #9BBF1A;
--text-primary:  #F5F5F0;
--text-secondary:#888888;
--text-muted:    #444444;
--success:       #22C55E;
--warning:       #F59E0B;
--danger:        #EF4444;
--font-display:  'Syne', sans-serif;      /* headings */
--font-body:     'DM Sans', sans-serif;   /* body */
--font-mono:     'JetBrains Mono', monospace;
```

Import fonts from Google Fonts in layout.tsx:
```
https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap
```

Logo: use the text "VANDFORT" in Syne 700, color: var(--accent).
Do not use an image — the logo is a wordmark.

---

## File structure to build

```
/app
  layout.tsx              — root layout, fonts, CSP meta, Vandfort nav
  page.tsx                — landing: connect HubSpot or Salesforce (OAuth)
  /dashboard
    page.tsx              — scan history (from IndexedDB), KPI summary, New Scan CTA
  /scan
    page.tsx              — scan config: object selector, match rules, threshold slider
    running/page.tsx      — live progress from Web Worker
  /review
    page.tsx              — core screen: duplicate groups, merge/skip actions
  /audit
    page.tsx              — read-only mode: scan + Audit Appendix PDF export

/components
  /ui
    kpi-card.tsx          — stat tile (label + value + delta)
    confidence-badge.tsx  — color-coded match % pill
    property-diff.tsx     — side-by-side record comparison table
    group-card.tsx        — expandable duplicate group card
    progress-ring.tsx     — circular scan progress indicator
  /providers
    hubspot.ts            — HubSpotProvider implementing CRMProvider interface
    salesforce.ts         — SalesforceProvider implementing CRMProvider interface
    index.ts              — CRMProvider interface definition
  /match
    engine.ts             — orchestrates passes, sends to Web Worker
    normalize.ts          — name, domain, phone, email, VAT normalization
    fuzzy.ts              — token-set ratio, Jaro-Winkler, Levenshtein

/workers
  match.worker.ts         — Web Worker: runs all three match passes off main thread

/lib
  db.ts                   — IndexedDB schema + helpers via idb
  session.ts              — sessionStorage OAuth token helpers
  benchmark.ts            — anonymized metrics → Cloudflare D1 (opt-in)
  pdf.ts                  — Audit Appendix PDF generator (jsPDF, client-side)

/types
  index.ts                — Record, DuplicateGroup, ScanConfig, MatchResult, etc.

/.cloudflare/workers
  oauth-proxy.ts          — Cloudflare Worker: HubSpot token exchange, no body logging
  claude-proxy.ts         — Cloudflare Worker: Anthropic API proxy, no body logging

wrangler.toml             — Workers config
next.config.ts            — output: 'export', no server runtime
tailwind.config.ts        — brand tokens as custom colors
components.json           — shadcn/ui config
```

---

## CRM provider interface

```typescript
// /components/providers/index.ts
export interface CRMRecord {
  id: string;
  objectType: 'company' | 'contact';
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
}

export interface MergeResult {
  success: boolean;
  primaryId: string;
  mergedIds: string[];
  error?: string;
}

export interface CRMProvider {
  name: 'hubspot' | 'salesforce';
  authenticate(): Promise<{ token: string; portalId?: string; instanceUrl?: string }>;
  fetchRecords(objectType: 'company' | 'contact', fields: string[]): AsyncGenerator<CRMRecord[]>;
  mergeRecords(primaryId: string, secondaryIds: string[]): Promise<MergeResult>;
  getAvailableProperties(objectType: 'company' | 'contact'): Promise<Property[]>;
}
```

---

## Match engine — three passes

**Pass 1 — Exact (100% confidence, deterministic)**
Fields to normalize before comparison:
- `domain`: strip protocol, www, trailing slash, lowercase
- `name`: lowercase, strip punctuation, strip legal suffixes (Inc, LLC, Ltd, GmbH, SAS, SA, SARL, BV, AG, SpA, SL, SRL, Pty, Corp, Co, NV, OY)
- `phone`: E.164 strip, digits only
- `email` (contacts): lowercase + strip plus-addressing
- `vat`: strip country prefix, spaces, dots — e.g. FR12345678901 → 12345678901
- `siren`: 9 digits, strip spaces — French company identifier

**Pass 2 — Fuzzy (70–99% confidence)**
Use `fastest-levenshtein` and manual token-set ratio implementation (no heavy NLP deps).
Default threshold: 85%.
- Token-set ratio on normalized company name
- Jaro-Winkler on domain root
- Levenshtein on address line 1 (when present on both records)

**Pass 3 — Claude edge-case (70–85% ambiguous zone)**
Prompt via claude-proxy Worker:
```
Are these two CRM records the same company?
Record 1: {name, domain, country, phone}
Record 2: {name, domain, country, phone}
Return only JSON: {"match": boolean, "confidence": 0-100, "reasoning": "one sentence"}
```
- Cache results in IndexedDB by SHA-256 hash of record pair
- Cap at 5% of total groups per scan (cost control)
- Model: claude-haiku-4-5-20251001

**All three passes run inside the Web Worker** — never block the main thread.
Stream results back to main thread as groups are found via `postMessage`.

---

## Core UI screen — Review Duplicates

Match this layout (based on Dedupleo reference):

```
┌─────────────────────────────────────────────────────────┐
│ Review Duplicates: Companies          [New Scan]        │
│ Scan complete. Found 1432 groups across 131,685 records │
├──────────┬──────────┬──────────┬──────────┐            │
│  1432    │    1     │    0     │   1431   │            │
│  Groups  │ Merged   │ Skipped  │ Pending  │            │
├──────────┴──────────┴──────────┴──────────┘            │
│ [Pending] [Merged] [Skipped] [All]  [Skip All] [Auto-merge All (1431)] │
├─────────────────────────────────────────────────────────┤
│ ▼ Company A — Company A              [Skip] [Merge]    │
│   2 records · 100% match                               │
│   PRIMARY: ● Company A #100001  ○ Company A #100002    │
│   ┌──────────┬──────────────────┬──────────────────┐  │
│   │ Property │ Record 1 (primary)│ Record 2         │  │
│   ├──────────┼──────────────────┼──────────────────┤  │
│   │ name     │ Company A        │ Company A        │  │
│   │ domain   │ company-a.com    │ companya.com     │  │ ← highlight diff
│   └──────────┴──────────────────┴──────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ ▶ Company B — Company B  · 100%      [Skip] [Merge]    │
│ ▶ Company C — Company C  · 100%      [Skip] [Merge]    │
└─────────────────────────────────────────────────────────┘
```

Use `react-virtuoso` for virtualized list — must handle 10,000+ groups without lag.
Highlight property cells where values differ between records.
Primary record selector: pill toggle, clicking switches which record is primary.

---

## IndexedDB schema

```typescript
// /lib/db.ts
interface VandfortDB {
  scans: {
    key: string; // scan id
    value: {
      id: string;
      crmType: 'hubspot' | 'salesforce';
      objectType: 'company' | 'contact';
      portalId: string;
      startedAt: number;
      completedAt?: number;
      totalRecords: number;
      totalGroups: number;
      status: 'running' | 'complete' | 'failed' | 'paused';
      config: ScanConfig;
    };
  };
  groups: {
    key: string; // group id
    value: {
      id: string;
      scanId: string;
      records: CRMRecord[];
      confidence: number;
      matchRule: string;
      status: 'pending' | 'merged' | 'skipped';
      primaryRecordId?: string;
      resolvedAt?: number;
    };
    indexes: { 'by-scan': string; 'by-status': string };
  };
  mergeLog: {
    key: string;
    value: {
      id: string;
      groupId: string;
      primaryId: string;
      mergedIds: string[];
      executedAt: number;
      crmResponse: unknown;
      status: 'success' | 'failed';
      error?: string;
    };
  };
  claudeCache: {
    key: string; // SHA-256 hash of record pair
    value: {
      hash: string;
      match: boolean;
      confidence: number;
      reasoning: string;
      cachedAt: number;
    };
  };
}
```

---

## Cloudflare Workers

### oauth-proxy.ts
- Accepts POST with `{ code, redirect_uri }` from browser
- Exchanges for HubSpot access + refresh token using `HUBSPOT_CLIENT_SECRET` env var
- Returns tokens to browser
- **No logging of request body or token values**
- CORS: allow only `https://dedup.vandfort.com` and `https://vandfort-dedup.pages.dev`

### claude-proxy.ts
- Accepts POST with `{ messages, model, max_tokens }` from browser
- Forwards to Anthropic API using `ANTHROPIC_API_KEY` env var
- Returns response to browser
- **No logging of request body**
- Rate limit: 10 req/min per IP (Cloudflare rate limiting rules)
- CORS: same as above

---

## Audit mode (/audit)

Read-only OAuth scopes only. No merge UI shown.
After scan completes, generate PDF client-side using jsPDF:

Pages:
1. Cover: "Duplicate Analysis — [Portal Name] — [Date]" — Vandfort branded
2. Executive summary: total records, groups found, estimated leak ($180 per duplicate group as conservative estimate), confidence distribution
3. Recharts bar chart rendered to canvas → embedded as image in PDF
4. Top 5 duplicate groups (anonymized option: replace names with "Company A", "Company B")
5. Remediation recommendation: which S2 mode (Design/Fix/Run) based on duplicate rate thresholds:
   - < 0.5% rate → Design (clean baseline)
   - 0.5–3% rate → Fix (remediation needed)
   - > 3% rate → Run (ongoing monitoring)

---

## Benchmark opt-in (post-scan modal)

After scan completes, show modal:
> "Help improve Vandfort's Revenue Health Score benchmarks?
> We'll save only anonymized metrics — no company names, no records, nothing identifying."

If accepted, POST to Cloudflare D1 via a fetch to `/api/benchmark`:
```json
{
  "crm_type": "hubspot",
  "arr_band": "10-15M",
  "industry": "SaaS",
  "crm_age_months": 24,
  "record_count_rounded": 130000,
  "duplicate_rate": 0.011,
  "confidence_p50": 100,
  "confidence_p90": 88
}
```
No client name, no portal ID, no record content.

---

## Dependencies to install

```bash
npm install next@14 react react-dom typescript
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-slider @radix-ui/react-switch
npm install lucide-react
npm install idb                          # IndexedDB wrapper
npm install fastest-levenshtein          # Levenshtein distance
npm install jspdf                        # Client-side PDF generation
npm install recharts                     # Charts for Audit PDF
npm install react-virtuoso               # Virtualized list for 10K+ groups
npm install @cloudflare/workers-types    # Cloudflare Worker types
npm install wrangler --save-dev          # Cloudflare CLI
npm install comlink                      # Web Worker RPC (cleaner than raw postMessage)
```

Google Fonts (loaded via <link> in layout.tsx, not npm):
- Syne 600/700/800
- DM Sans 300/400/500
- JetBrains Mono 400/500

---

## Key implementation notes

1. **Web Worker communication**: Use Comlink to expose the match engine as an async API.
   The main thread calls `worker.runScan(config)` and receives streamed progress events.

2. **HubSpot pagination**: Use `after` cursor from response. Fetch 100 records/page.
   Implement token bucket: max 9 requests/second (stay under 100/10s limit with buffer).
   On 429: exponential backoff starting at 1s.

3. **Salesforce PKCE**: Generate `code_verifier` (43-128 char random string) and
   `code_challenge` (SHA-256 of verifier, base64url encoded) client-side.
   No Worker needed — the browser handles the full PKCE flow.

4. **Merge confirmation**: Always show a diff of which properties will change before executing.
   Store a pre-merge snapshot in IndexedDB. Merge is irreversible in the CRM.

5. **Virtualized list**: `react-virtuoso` with `overscan={5}`. Test with 10,000 groups.
   Each group card collapses by default. Expand on click. Only one expanded at a time.

6. **Auto-merge safety**: Require explicit confirmation for bulk actions > 100 groups.
   Show exactly how many merges will execute and that they are irreversible.

7. **Clear local data**: Button in settings/footer clears all IndexedDB stores.
   Confirm with user before clearing. Log count of records that will be deleted.

8. **CSP**: Set via next.config.ts headers:
   ```
   Content-Security-Policy: default-src 'self';
     connect-src 'self' https://api.hubapi.com https://*.salesforce.com
                 https://oauth-proxy.vandfort.workers.dev
                 https://claude-proxy.vandfort.workers.dev;
     font-src 'self' https://fonts.gstatic.com;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
   ```

---

## What to build in each session

### Session 1 — Scaffold + brand
- next.config.ts with `output: 'export'`
- tailwind.config.ts with brand tokens
- app/layout.tsx with fonts, CSP, Vandfort nav
- app/page.tsx — landing: "Connect HubSpot" / "Connect Salesforce" cards
- components/providers/index.ts — CRMProvider interface + types/index.ts

### Session 2 — HubSpot provider + OAuth
- .cloudflare/workers/oauth-proxy.ts
- components/providers/hubspot.ts — full OAuth + paginated fetch + merge
- lib/session.ts — sessionStorage token helpers
- wrangler.toml

### Session 3 — Match engine
- workers/match.worker.ts
- components/match/normalize.ts — all normalization functions
- components/match/fuzzy.ts — token-set ratio, Jaro-Winkler, Levenshtein
- components/match/engine.ts — orchestrates passes + Comlink export
- .cloudflare/workers/claude-proxy.ts

### Session 4 — IndexedDB + scan flow
- lib/db.ts — full IndexedDB schema
- app/scan/page.tsx — config UI
- app/scan/running/page.tsx — live progress
- app/dashboard/page.tsx — scan history

### Session 5 — Review Duplicates (core screen)
- components/ui/group-card.tsx
- components/ui/property-diff.tsx
- components/ui/confidence-badge.tsx
- components/ui/kpi-card.tsx
- app/review/page.tsx — full virtualized list, merge/skip actions

### Session 6 — Salesforce provider
- components/providers/salesforce.ts — PKCE OAuth + Bulk API + merge

### Session 7 — Audit mode + PDF
- app/audit/page.tsx
- lib/pdf.ts — jsPDF Audit Appendix generator

### Session 8 — Benchmark + security review
- lib/benchmark.ts
- Security checklist from spec: Network tab, CSP, sessionStorage, IndexedDB clearing

---

## Definition of done

- [ ] HubSpot OAuth connects and fetches records end-to-end
- [ ] Salesforce PKCE connects and fetches records end-to-end
- [ ] Match engine runs in Web Worker, does not block UI during 100K record scan
- [ ] Review Duplicates screen handles 10,000+ groups without lag (react-virtuoso)
- [ ] Merge executes against CRM API with pre-merge snapshot in IndexedDB
- [ ] Auto-merge bulk action requires explicit confirmation > 100 groups
- [ ] Audit mode generates branded PDF client-side
- [ ] Network tab shows zero Vandfort-domain requests containing record data
- [ ] sessionStorage cleared on tab close (verified in browser)
- [ ] IndexedDB clear button works and confirms count before clearing
- [ ] Deployed to Cloudflare Pages at vandfort-dedup.pages.dev
- [ ] Both Cloudflare Workers deployed with body logging disabled
