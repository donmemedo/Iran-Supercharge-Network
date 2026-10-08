# Graph Report - Iran-Supercharge-Network  (2026-10-08)

## Corpus Check
- Corpus is ~15,177 words - fits in a single context window. You may not need a graph.

## Summary
- 235 nodes · 439 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.82)
- Token cost: 0 input · 112,655 output

## Community Hubs (Navigation)
- Infra, Docs and Findings
- Backend API Core
- Frontend Dependencies
- Root Layout and Config
- TypeScript Config
- Investor Dashboard
- Landing Page Shell
- Booking and Lead Forms
- Landing Sections
- i18n and Formatting
- API Client Types
- API Proxy Route
- PostCSS Config

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 31 edges
2. `HANDOFF.md (security, pentest, performance and UI handoff)` - 27 edges
3. `num()` - 16 edges
4. `compilerOptions` - 16 edges
5. `reserve()` - 9 edges
6. `fill()` - 9 edges
7. `Next.js /api/* server-side proxy to BACKEND_URL (route.ts)` - 9 edges
8. `now_irt()` - 8 edges
9. `next` - 8 edges
10. `ReserveSheet()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Finding 7: reservation code collisions with token_hex(3) (Medium)` --references--> `reserve()`  [INFERRED]
  HANDOFF.md → backend/app/main.py
- `Perf 18: polling never backs off after errors` --references--> `usePoll()`  [EXTRACTED]
  HANDOFF.md → frontend/src/lib/api.ts
- `Finding 1: booking store exhaustion via MAX_ROWS (High)` --references--> `reserve()`  [EXTRACTED]
  HANDOFF.md → backend/app/main.py
- `Finding 1: booking store exhaustion via MAX_ROWS (High)` --references--> `lead()`  [EXTRACTED]
  HANDOFF.md → backend/app/main.py
- `Finding 10: sequential lead IDs leak count (Low)` --references--> `lead()`  [EXTRACTED]
  HANDOFF.md → backend/app/main.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Booking abuse defense: rate limit by real client IP over in-memory state** — handoff_finding_booking_store_exhaustion, handoff_finding_proxy_hides_client_ip, handoff_ip_rate_limiter, handoff_in_memory_single_worker [INFERRED 0.85]
- **Infrastructure hardening (plan step 5: items 3, 8, 9)** — handoff_finding_backend_port_published, handoff_finding_containers_not_hardened, handoff_finding_unpinned_supply_chain, docker_compose [EXTRACTED 1.00]
- **Reducing /api/network polling load (cache, gzip, backoff)** — handoff_perf_network_recompute, handoff_perf_no_gzip, handoff_perf_polling_no_backoff, handoff_api_endpoints [INFERRED 0.85]

## Communities (14 total, 3 thin omitted)

### Community 0 - "Infra, Docs and Findings"
Cohesion: 0.08
Nodes (38): fastapi==0.141.1, httpx==0.28.1, uvicorn[standard]==0.53.0, backend service (8020:8000, /api/health healthcheck), frontend service (BACKEND_URL=http://backend:8000, port 3020), Next.js 16 agent rules (read node_modules/next/dist/docs before coding), App icon: gradient lightning bolt on dark rounded square, HANDOFF.md (security, pentest, performance and UI handoff) (+30 more)

### Community 1 - "Backend API Core"
Cohesion: 0.11
Nodes (31): charger_states(), financials(), health(), lead(), LeadIn, network(), now_irt(), Iran Supercharge Network API: hubs with simulated live charger status,… (+23 more)

### Community 2 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (32): dependencies, @fontsource-variable/inter, @fontsource-variable/vazirmatn, lucide-react, motion, next, react, react-dom (+24 more)

### Community 3 - "Root Layout and Config"
Cohesion: 0.11
Nodes (20): nextConfig, frontend_src_app_globals, dynamicParams, generateMetadata(), RootLayout(), viewport, Nav(), TabBar() (+12 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 5 - "Investor Dashboard"
Cohesion: 0.23
Nodes (9): CashChart(), GROUP_COLORS, Investors(), PLChart(), useScale(), Footer(), HubCard(), Reveal() (+1 more)

### Community 6 - "Landing Page Shell"
Cohesion: 0.21
Nodes (9): Landing(), LINKS, LiveStrip(), NetMap(), placeStatus(), POS, WHY_ICONS, usePoll() (+1 more)

### Community 7 - "Booking and Lead Forms"
Cohesion: 0.22
Nodes (11): FleetForm(), Done, ReserveSheet(), Slot, iconBtn, api(), ApiError, Hub (+3 more)

### Community 8 - "Landing Sections"
Cohesion: 0.23
Nodes (12): Axes(), Calc(), ChargerPill(), Faq(), Hero(), NetworkSection(), Orb(), Plans() (+4 more)

### Community 9 - "i18n and Formatting"
Cohesion: 0.26
Nodes (8): en, fa, Locale, locales, cache, nf(), pct(), tf

### Community 10 - "API Client Types"
Cohesion: 0.25
Nodes (7): Charger, Financials, Month, Network, Place, Tier, react

## Knowledge Gaps
- **67 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 94 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HANDOFF.md (security, pentest, performance and UI handoff)` connect `Infra, Docs and Findings` to `Backend API Core`?**
  _High betweenness centrality (0.439) - this node is a cross-community bridge._
- **Why does `usePoll()` connect `Landing Page Shell` to `Infra, Docs and Findings`, `API Client Types`, `Booking and Lead Forms`?**
  _High betweenness centrality (0.375) - this node is a cross-community bridge._
- **Why does `Perf 18: polling never backs off after errors` connect `Infra, Docs and Findings` to `Landing Page Shell`?**
  _High betweenness centrality (0.373) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Infra, Docs and Findings` be split into smaller, more focused modules?**
  _Cohesion score 0.08130081300813008 - nodes in this community are weakly interconnected._
- **Should `Backend API Core` be split into smaller, more focused modules?**
  _Cohesion score 0.10634920634920635 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._