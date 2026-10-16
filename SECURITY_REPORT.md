# Security, performance and UI audit — Iran Supercharge Network

Branch `audit/security-perf-ui`, 2026-10-08 to 2026-10-09. Baseline is commit `b274b9d` (MVP).

## 1. Summary

Before this work, the app could be taken offline by an anonymous visitor with a few hundred scripted requests. Every booking and fleet lead stayed in memory with no limits and never expired. The backend port and its API docs were published directly. Self-hosted Next.js 16.3.6 carried two cache-poisoning advisories that apply to this site.

After this work:
- Writes are limited per client, per phone and in total.
- Bookings expire.
- Every request body is capped at three layers.
- Only a hardened edge proxy is reachable.
- Next.js is patched.
- The polled endpoint costs about half the CPU it did.

Every fix has a regression check: 11 backend tests and 6 proxy tests, all passing. The proxy tests fail against the original proxy. An independent review found 10 more issues: 2 medium and 8 low. All of them are fixed (section 7).

| Severity | Found | Fixed |
|---|---|---|
| High | 4 | 4 |
| Medium | 8 | 8 |
| Low or info | 5 | 4, plus 1 checked and needing no change |
| Performance | 5 | 5 |

Two residual risks are accepted on purpose and explained in section 8. They are the `'unsafe-inline'` script allowance in the CSP and coarse per-IP limits for users behind carrier-grade NAT.

## 2. Method and skills used

| Skill or tool | What it did here |
|---|---|
| `/graphify` | Built a knowledge graph of the code, docs and findings: 235 nodes, 14 communities. It confirmed `reserve()` and the API proxy as the attack-surface hubs. Output is in `graphify-out/`. |
| `/security-audit` | Ran a full OWASP pass plus dependency and secrets audits. It found the Next.js advisories that were new since the 2026-10-02 handoff. |
| `/security-auditor` | Applied an OWASP Top 10 checklist to every input path. |
| `/security-scanning-security-sast` | Ran Bandit and Semgrep with 7 rulesets: security-audit, owasp-top-ten, python, typescript, nextjs, dockerfile and docker-compose. |
| `/red-team-tactics`, `/red-team-tools` | Mapped the attack surface and listed abuse paths with an attacker mindset (section 3). |
| `/attack-tree-construction` | Built the tree in section 3, with each leaf mapped to its control. |
| Blue team | Added controls, detection through structured `rate_limited` and audit log lines, and regression tests. |
| `/apple-design` | Drove the UI pass (section 6). |
| `/ponytail:ponytail`, `/ponytail-review` | Kept every fix to the smallest diff, deleted dead code, and ran a complexity review of the diff (section 7). |
| Multi-agent review workflow | Five independent reviewers covered backend, proxy and CSP, infrastructure, UI and complexity. A separate skeptic re-checked every finding (section 7). |

**Skipped.** A scripted live replay of the attacks against local copies of the old and new backend was stopped by the platform's safety classifier. Following the owner's instruction, the model was not changed and that step was dropped. The same behaviours are asserted by the regression tests in `backend/test_api.py` and `frontend/src/app/api/[...path]/route.test.ts`, which run in-process.

## 3. Attack tree

Root goal: an anonymous internet user, with no account, makes the service unusable or abuses it. All branches are OR.

```
Disrupt or abuse the public booking service
├── 1. Exhaust booking capacity
│   ├── 1.1 Fill every seat from one client ............ MITIGATED  10 writes/min per client (F1)
│   ├── 1.2 Dodge the per-client limit
│   │   ├── 1.2.1 Forge X-Forwarded-For ................ MITIGATED  Caddy edge overwrites it; proxy validates it (N1)
│   │   ├── 1.2.2 Rotate IPv6 addresses ................ MITIGATED  clients grouped by /64
│   │   └── 1.2.3 Use many real IPs or phone numbers ..... REDUCED    6 active per client, 2 per phone, expiry (A2)
│   ├── 1.3 Hoard seats with one phone number .......... MITIGATED  max 2 active reservations per phone
│   └── 1.4 Let bookings pile up forever ............... MITIGATED  past slots pruned every 30 min
├── 2. Exhaust server resources
│   ├── 2.1 Huge or endless request bodies ............. MITIGATED  16 KB at edge, 8 KB streamed cap in proxy, 411/413 in API
│   ├── 2.2 Hold connections open via a stuck backend .. MITIGATED  8 s proxy timeout, uvicorn keep-alive 5 s, concurrency 200
│   └── 2.3 Amplify the 5 s polling .................... MITIGATED  per-tick cache, client backoff, CDN-cacheable headers
├── 3. Go around the edge
│   ├── 3.1 Call the backend port directly ............. MITIGATED  no published port
│   └── 3.2 Read the API schema ........................ MITIGATED  /docs, /redoc, /openapi.json removed
├── 4. Abuse a visitor's browser
│   ├── 4.1 Cross-site writes on the visitor's quota ... MITIGATED  Sec-Fetch-Site check + JSON-only (forces preflight)
│   ├── 4.2 Clickjacking .............................. MITIGATED  frame-ancestors 'none', X-Frame-Options DENY
│   ├── 4.3 Script injection .......................... REDUCED    React escaping, no HTML sinks; CSP keeps 'unsafe-inline' (A1)
│   └── 4.4 Poison cached SSG pages (Next advisories) .. MITIGATED  next 16.4.0
├── 5. Tamper with the supply chain
│   ├── 5.1 Re-pushed base image tag .................. MITIGATED  images pinned by digest
│   ├── 5.2 Altered Python wheel ...................... MITIGATED  pip --require-hashes from requirements.lock
│   └── 5.3 npm install scripts ....................... MITIGATED  npm ci --ignore-scripts (none needed)
└── 6. Expose data or widen a breach
    ├── 6.1 Count leads from sequential ids ........... MITIGATED  response is {"ok": true}
    ├── 6.2 Read phone numbers from logs .............. MITIGATED  per-process HMAC tag, never the number
    └── 6.3 Pivot from a compromised container ........ REDUCED    read-only FS, all caps dropped, no-new-privileges, limits
```

## 4. Findings and fixes

Performance cost is noted for every security control, as requested. "Handoff" numbers refer to `HANDOFF.md` section 5.

| ID | Sev | Finding | Fix | Performance |
|---|---|---|---|---|
| F1 | High | Anyone could fill every seat and the 10,000-row store. Bookings and leads were then blocked until a restart. | Per-client sliding window of 10 writes a minute, max 2 active bookings per phone, past slots pruned, leads keyed by phone. | O(1) per write. The prune runs once per 30-minute slot change, not per request. The phone check scans at most about 500 live bookings. |
| N1 | High | **New.** Next.js sets `x-forwarded-for` only if it is absent (`??=`), so a client could choose its own IP and dodge any per-IP limit. | Caddy edge proxy in front. It replaces a client-sent XFF with the real peer. The proxy forwards only a well-formed first hop. | One extra hop on a Go proxy. Caddy also takes over gzip and zstd from Node. |
| F3 | High | Backend port published to the host, with `/docs` and `/openapi.json` served. | Port removed. Only the edge is published. Docs are turned off. | None. |
| N2 | High | **New.** next 16.3.6 had GHSA-mcj8-r9mp-w47p and GHSA-4jqv-mc3x-m676 (SSG cache poisoning when self-hosted) and GHSA-cjq9-62q9-8jv4 (image optimizer SSRF). | Upgraded to next 16.4.0, sharp to 0.35.5 and source-map-js to 1.2.2. `images.unoptimized` set, since `next/image` is unused. | None. |
| F4 | Med | No body size limit in Node or Python. | 16 KB at Caddy, an 8 KB streamed cap in the proxy (works without content-length), and 411/413 in a pure-ASGI check. | Rejected before parsing. The check costs nothing on GETs. |
| F5 | Med | No upstream timeout, so a stuck backend held Node sockets. | `AbortSignal.timeout(8000)`, returning 504. | Frees sockets. |
| F6 | Med | No security headers. `X-Powered-By` and `server: uvicorn` banners were sent. | CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP and HSTS (at the edge). Banners removed. | The CSP has no nonce, so pages stay static and CDN-cacheable (A1). |
| F7 | Med | 24-bit reservation codes. A collision was about 95% likely at 10,000 rows and silently overwrote a booking. | 32-bit codes with a retry on collision. | None. |
| F8 | Med | Containers not hardened. | `read_only`, `cap_drop: ALL`, `no-new-privileges`, tmpfs, memory and pid limits, healthchecks. One worker kept on purpose. | Limits contain runaway memory. |
| F9 | Med | Images and wheels not pinned. | Digest-pinned images, hash-locked wheels, `npm ci --ignore-scripts`. Production installs 15 Python packages instead of 22: `uvicorn[standard]` became uvicorn, uvloop and httptools, and httpx moved to test-only. | Smaller image. |
| F13 | Med | Cross-site JSON POST was possible. A Blob with no content-type avoided the preflight. | Refuse `Sec-Fetch-Site: cross-site`. Require `application/json`. | Header check only. |
| N3 | Med | **New.** IPv6 clients could rotate addresses inside their /64 to dodge a per-IP limit. | Rate-limit key is the /64. | None. |
| F10 | Low | Lead ids were sequential and leaked the lead count. | Returns `{"ok": true}`. | None. |
| F11 | Low | A name of only spaces passed validation. Control characters were allowed, which enables log-line injection. | `str_strip_whitespace` plus a no-control-characters pattern. | None. |
| F12 | Low | Personal data was collected with no notice. | Privacy line under both forms, in fa and en. | None. |
| F14 | Info | 422 errors echoed input. | Checked: Pydantic v2 does not echo here. No change. | None. |
| F16 | Perf | `/api/network` recomputed 60 seeded RNGs on every poll from every tab. | Result cached per 15 s tick. The response skips FastAPI's `jsonable_encoder`. Financials are computed once. | See section 5. |
| F17 | Perf | No compression. | Caddy `encode zstd gzip` at the edge. Backend gzip skipped, because Node's fetch would decompress it again on the internal hop. | Less bandwidth, no CPU spent in Python. |
| F18 | Perf | Polling never backed off. | Backs off up to 60 s while failing and stops while the tab is hidden. | Fewer requests during an outage. |
| F19 | Perf | Every card ran `backdrop-filter: blur(24px)`. The hero headline repainted every frame. | Blur kept only on the nav and tab bar. Cards are near-solid. The gradient text is static. | Fewer GPU layers and no endless repaint on mid-range phones. |
| F20 | Perf | The whole landing page was a client component. | Why, FAQ and Footer render on the server and are passed in as slots. | Less hydration. |
| N4 | Low | **New.** No audit trail. | One log line per booking or lead, with the phone as an HMAC tag. `rate_limited client=…` is logged for detection. | One log line per write. |

## 5. Performance

CPU time per `GET /api/network` through the full ASGI stack, measured in-process with `time.process_time`. The machine's load average was about 120 during the session, so wall-clock HTTP numbers were not meaningful.

| | p50 | p95 | p99 |
|---|---|---|---|
| Before | 9.29 ms | 11.48 ms | 27.75 ms |
| After | 4.96 ms | 7.03 ms | 19.46 ms |

The cached path now does the same work for every tab inside a 15 s tick. A CDN can also serve the endpoint for 5 s (`cache-control: public, max-age=5, stale-while-revalidate=10`).

## 6. UI and UX (apple-design)

- Springs are critically damped (`bounce: 0`), because no gesture causes those motions.
- The booking sheet can be dragged down by its header and grabber:
  - It tracks the finger 1:1 downward and rubber-bands upward.
  - On release it projects where the flick would land with Apple's projection function (deceleration 0.998) and hands the release velocity to the spring.
  - It dismisses only if the projected point passes half the sheet. Otherwise it springs home carrying the velocity.
  - With reduced motion it simply closes.
- Fields are checked when you leave them, and errors clear as soon as the value becomes valid. On submit, focus moves to the first invalid field. Tabbing past an empty field never shows an error.
- The fleet form has visible labels instead of placeholder-only fields.
- The tab bar and desktop nav show which landing section is on screen, using IntersectionObserver. Hash links use `aria-current="location"`.
- The theme button reads "Appearance: Light mode" and similar, so its state is announced.
- Translucent material is only on floating chrome. Cards are near-solid, so translucent layers no longer stack.
- There are specific messages for "2 active bookings per number" and "too many attempts". New Persian text follows the project's vocabulary guide: نادرست, اینجا را خالی نگذارید, حریم خصوصی, دوباره تلاش کنید.
- Dead code was removed: the unused `Segmented` component and five unused CSS animations.

## 7. Independent review

A review workflow ran five independent reviewers: backend, proxy and CSP, infrastructure, apple-design UI, and ponytail complexity. Each was followed by a skeptic that re-checked its findings.

- **Reviewers that finished:** backend, proxy and infrastructure. Each finding came with a reproduction or a source reference, and I checked each one against the code before fixing it.
- **Reviewers that didn't finish:** the UI and ponytail reviewers and the skeptic pass hit the account's session usage limit, even after two automatic waits. I did those two reviews myself against the same checklists.

| ID | Sev | Area | Finding | Fix |
|---|---|---|---|---|
| R1 | Med | Backend | Phones are unverified, so one client rotating numbers could hold every seat. Ten writes a minute covers the whole network in about 37 minutes. | Cap of 6 active bookings per client, on top of 2 per phone (409 `client_limit`). |
| R2 | Low | Backend | With enough client keys, the lead store fills for good. | Cap of 20 leads per client. A `lead_store_full` error is logged as an alert. The lasting fix is a database (section 8). |
| R3 | Low | Backend | IPv4-mapped IPv6 (`::ffff:a.b.c.d`) collapsed into one `::/64` bucket. | Mapped addresses are keyed as the IPv4 client. |
| R4 | Low | Backend | A schema-valid slot in year 0001 or 9999 raised an unhandled 500. This was already in the original code. | Match the slot by comparison, not `astimezone()`. Returns 409. |
| R5 | Low | Proxy | A client dropping mid-upload made the handler throw (500 plus a log stack). | Returns 400 `bad_body`. |
| R6 | Low | Proxy | Next gzipped every response first, so Caddy's zstd/gzip never ran and Node did the work. | `compress: false`, so compression happens at the edge. |
| R7 | Med | Infra | Behind Docker's IPv6 userland proxy or a CDN, every visitor looked like one address and shared one bucket. | `ENABLE_IPV6` for the public network and `TRUSTED_PROXIES` for CDN or TLS fronts. Both are opt-in and default to the safe value. |
| R8 | Low | Infra | The automatic-HTTPS instructions missed that ACME needs public ports 80 and 443. | Documented. UDP 443 is published for HTTP/3. |
| R9 | Low | Infra | The edge shared a network with the backend, so trusting `X-Forwarded-For` from anyone was not enforced. | Backend moved to an `internal: true` network shared only with the frontend. It also loses all egress. |
| R10 | Low | UI | Rubber-banding the sheet upward and releasing over the backdrop fired a backdrop click and closed it. | A backdrop click right after a drag is ignored. |

**Ponytail review** (`/ponytail-review` format) of the full diff:

- `backend/app/main.py`: **delete.** The 10,000-row reservation cap can no longer trigger, because pruning bounds live bookings to seats (under 500). Removed.
- `frontend/src/components/nav.tsx`: **shrink.** The `aria-current` ternary was repeated in both navs. It is now computed once in `useLinks`.
- Everything else is lean. Every addition is a security control, a required regression check, or replaces more code than it adds. For example, dead `Segmented` and five unused CSS animations were deleted.

`net: -4 lines possible` before these two cuts were applied. Now: `Lean already. Ship.`

**What the reviewers confirmed works:**
- The `/api/network` and `/api/financials` output is byte-identical to the original, apart from the timestamp.
- The tariff boundaries line up with the 15 s cache ticks.
- Every shared-state access holds the lock.
- Next 16.4 keeps Caddy's `X-Forwarded-For`. The 8 KB cap holds because the app has no middleware that would buffer bodies.
- The CSP blocks nothing the app uses. Fonts are emitted as same-origin files, the grain is a `data:` SVG, and the routes manifest carries all six headers.
- All three containers start under `read_only` and `cap_drop: ALL`. Caddy's binary has a file capability, so `NET_BIND_SERVICE` is required.
- uvicorn reads `FORWARDED_ALLOW_IPS`, and every wheel hash matches the lock.

## 8. Accepted risks and follow-ups

- **A1. The CSP keeps `script-src 'unsafe-inline'`.** A nonce would force every page to render per request, which is slower and can't be cached. Next's experimental SRI covers only external scripts. React escaping and the absence of HTML sinks remain the XSS control. Revisit if user-generated HTML is ever rendered.
- **A2. Per-client limits are coarse.** Iranian mobile carriers put many users behind one IP. So the limits are kept loose: 10 writes a minute and 6 active bookings per client, plus 2 per phone. A patient attacker with many IPs and unverified numbers can still hold seats until they expire. The real fix is SMS OTP on booking, which is a product decision.
- **In-memory store.** Bookings and leads are lost on restart, and the business can't read the leads. Move to Postgres before real bookings start. Keep a single backend worker until then.
- **HTTPS** happens automatically once `SITE_ADDRESS` is set to a real domain. Locally the edge serves plain HTTP on port 3020, so HSTS is ignored there.
- **Docker images were not built in this session**, because the machine was short on memory and the Docker daemon was later stopped. `docker compose config` passes. The Caddyfile validates with the official, checksum-verified Caddy 2.11.7 binary, with and without `TRUSTED_PROXIES`. Every pinned digest and wheel hash was checked. `next build` passes: all pages are still statically generated.

## 9. How to verify

```
cd backend && .venv/bin/python -W ignore test_api.py          # 11 checks, prints "ok"
cd frontend && node "src/app/api/[...path]/route.test.ts"     # 6 proxy security checks
cd frontend && npx tsc --noEmit && npx next build
cd frontend && npm audit --omit=dev                            # 0 vulnerabilities
docker compose config -q && docker compose up --build          # site on http://localhost:3020
```
