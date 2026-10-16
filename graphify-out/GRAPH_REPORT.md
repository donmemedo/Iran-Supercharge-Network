# Graph Report - Iran-Supercharge-Network  (2026-10-16)

## Corpus Check
- 29 files · ~22,130 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 9, .lock 1, .css 1)

## Summary
- 291 nodes · 596 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b73d09a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HANDOFF.md (security, pentest, performance and UI handoff)
- main.py
- package.json
- ui.tsx
- compilerOptions
- Security, performance and UI audit — Iran Supercharge Network
- BodyLimit
- landing.tsx
- index.ts
- route.test.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 28 edges
2. `HANDOFF.md (security, pentest, performance and UI handoff)` - 27 edges
3. `reserve()` - 16 edges
4. `num()` - 16 edges
5. `compilerOptions` - 16 edges
6. `Investors()` - 12 edges
7. `Card()` - 12 edges
8. `Landing()` - 10 edges
9. `ReserveSheet()` - 10 edges
10. `Security, performance and UI audit — Iran Supercharge Network` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Finding 7: reservation code collisions with token_hex(3) (Medium)` --references--> `reserve()`  [INFERRED]
  HANDOFF.md → backend/app/main.py
- `2. Method and skills used` --references--> `reserve()`  [INFERRED]
  SECURITY_REPORT.md → backend/app/main.py
- `7. Independent review` --references--> `useLinks()`  [INFERRED]
  SECURITY_REPORT.md → frontend/src/components/nav.tsx
- `Finding 1: booking store exhaustion via MAX_ROWS (High)` --references--> `reserve()`  [EXTRACTED]
  HANDOFF.md → backend/app/main.py
- `Finding 1: booking store exhaustion via MAX_ROWS (High)` --references--> `lead()`  [EXTRACTED]
  HANDOFF.md → backend/app/main.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Infrastructure hardening (plan step 5: items 3, 8, 9)** — handoff_finding_backend_port_published, handoff_finding_containers_not_hardened, handoff_finding_unpinned_supply_chain, docker_compose [EXTRACTED 1.00]
- **Booking abuse defense: rate limit by real client IP over in-memory state** — handoff_finding_booking_store_exhaustion, handoff_finding_proxy_hides_client_ip, handoff_ip_rate_limiter, handoff_in_memory_single_worker [INFERRED 0.85]
- **Reducing /api/network polling load (cache, gzip, backoff)** — handoff_perf_network_recompute, handoff_perf_no_gzip, handoff_perf_polling_no_backoff, handoff_api_endpoints [INFERRED 0.85]

## Communities (12 total, 3 thin omitted)

### Community 0 - "HANDOFF.md (security, pentest, performance and UI handoff)"
Cohesion: 0.08
Nodes (35): fastapi==0.141.1, httpx==0.28.1, uvicorn[standard]==0.53.0, backend service (8020:8000, /api/health healthcheck), frontend service (BACKEND_URL=http://backend:8000, port 3020), App icon: gradient lightning bolt on dark rounded square, HANDOFF.md (security, pentest, performance and UI handoff), Backend REST API endpoints (/api/health, /network, /hubs/{hid}/slots, /financials, /reservations, /leads) (+27 more)

### Community 1 - "main.py"
Cohesion: 0.06
Nodes (28): charger_states(), check_rate(), client_key(), _financials(), health(), hubs_at(), lead(), LeadIn (+20 more)

### Community 2 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, @fontsource-variable/inter, @fontsource-variable/vazirmatn, lucide-react, motion, next, react, react-dom (+21 more)

### Community 3 - "ui.tsx"
Cohesion: 0.11
Nodes (24): csp, nextConfig, dynamicParams, generateMetadata(), RootLayout(), viewport, Nav(), SECTIONS (+16 more)

### Community 4 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 5 - "Security, performance and UI audit — Iran Supercharge Network"
Cohesion: 0.18
Nodes (10): 1. Summary, 2. Method and skills used, 3. Attack tree, 4. Findings and fixes, 5. Performance, 6. UI and UX (apple-design), 7. Independent review, 8. Accepted risks and follow-ups (+2 more)

### Community 7 - "landing.tsx"
Cohesion: 0.10
Nodes (52): Axes(), CashChart(), GROUP_COLORS, Investors(), Legend(), PLChart(), useScale(), Calc() (+44 more)

### Community 9 - "index.ts"
Cohesion: 0.23
Nodes (12): Page(), Page(), Faq(), Footer(), Why(), WHY_ICONS, en, fa (+4 more)

### Community 11 - "route.test.ts"
Cohesion: 0.22
Nodes (6): dynamic, fail(), proxy(), readBody(), json, stub

## Knowledge Gaps
- **12 isolated node(s):** `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 116 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HANDOFF.md (security, pentest, performance and UI handoff)` connect `HANDOFF.md (security, pentest, performance and UI handoff)` to `main.py`?**
  _High betweenness centrality (0.370) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `reserve()` (e.g. with `Finding 7: reservation code collisions with token_hex(3) (Medium)` and `2. Method and skills used`) actually correct?**
  _`reserve()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tailwindcss/postcss`, `@types/node`, `@types/react` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HANDOFF.md (security, pentest, performance and UI handoff)` be split into smaller, more focused modules?**
  _Cohesion score 0.08013937282229965 - nodes in this community are weakly interconnected._
- **Why does `usePoll()` connect `landing.tsx` to `HANDOFF.md (security, pentest, performance and UI handoff)`?**
  _High betweenness centrality (0.292) - this node is a cross-community bridge._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Why does `Perf 18: polling never backs off after errors` connect `HANDOFF.md (security, pentest, performance and UI handoff)` to `landing.tsx`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._