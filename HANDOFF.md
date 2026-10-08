# Handoff: security audit, pentest, performance and UI pass

Session date: 2026-10-02. Written so another model or person can continue without the old chat.

## 1. What the owner asked for

1. Audit the whole project with red team and blue team agents, using security skills.
2. Run a penetration test of the app on localhost.
3. Fix every problem found.
4. Consider performance for every security item.
5. Improve the UI and UX following the `apple-design` skill (Apple's WWDC fluid-interface guidance for the web).
6. Finish within about 5 hours. Token cost is not a concern.

## 2. Status (updated 2026-10-08, session 2)

Done on branch `audit/security-perf-ui` (pushed, no PR yet):
- **Backend fixed** in `backend/app/main.py`: findings 1, 4, 7, 10, 11, 14 and perf 16, plus docs off (part of 3).
  - Per-client sliding-window limit of 10 writes a minute. IPv6 is grouped by /64. Every hit is logged as `rate_limited`.
  - At most 2 active reservations per phone. Past slots are pruned once per 30-minute window.
  - 8-hex codes with a retry on collision. POST bodies need a content-length of 8 KB or less, else 411 or 413.
  - Names are stripped and may not hold control characters. Leads are keyed by phone and return `{"ok": true}`.
  - Phones in audit logs are HMAC-tagged.
  - `/api/network` is cached per 15 s tick and skips `jsonable_encoder`. CPU per request fell from a 9.3 ms p50 to 5.0 ms. Financials are computed once.
- `backend/test_api.py` gained a regression check for each fix. Run it with `.venv/bin/python -W ignore test_api.py` and expect `ok`.
- Scans: Bandit reported 2 low hits, both seeded simulation `random`, now marked nosec. Semgrep found 0 results with 7 rulesets on the original code. pip-audit found 0.
- npm audit reports 3 high: next 16.3.6, plus sharp and source-map-js. The fix is `npm i next@16.4.0` then `npm audit fix`.
- Graphify output is in `graphify-out/`.

**New red-team finding:** Next sets `x-forwarded-for` with `??=`, so a client can choose its own IP when Next is the edge. The per-IP limit needs an edge proxy that overwrites the header. The plan is a Caddy service in compose that publishes the old port 3020, with frontend and backend left unpublished. Caddy ignores client XFF by default. Next has no `agentRules` option, so commit `frontend/AGENTS.md` instead.

Session 3, committed:
- **Proxy:** `route.ts` allow-lists path segments, refuses cross-site, non-JSON and over-8 KB bodies (also when chunked), forwards a validated first-hop client IP, times out at 8 s with 504, and passes upstream cache-control and retry-after through. `route.test.ts` holds 5 checks. All pass on the new proxy and fail on the old one. Run it with `node "src/app/api/[...path]/route.test.ts"`.
- **Headers:** `next.config.ts` sets `poweredByHeader: false`, a CSP without nonces (static rendering kept), nosniff, XFO DENY, Referrer-Policy, Permissions-Policy and COOP, plus `images.unoptimized`.
- **Infra:**
  - Caddy edge with `admin off`, HSTS, gzip and zstd, a 16 KB body cap on `/api` and no Server header. It replaces any XFF a client sends, and it is the only published service, on port 3020.
  - Containers are `read_only`, with `cap_drop ALL`, `no-new-privileges`, `tmpfs`, memory and pid limits, and healthchecks. Base images are pinned by digest.
  - The backend installs from `requirements.lock` with `--require-hashes`. `uvicorn[standard]` became uvicorn, uvloop and httptools.
  - `npm ci --ignore-scripts`. `.env*` is in all ignore files. Both `docker compose config` and `caddy validate` pass.
- **Frontend:**
  - Polling backs off up to 60 s and resumes when the tab becomes visible.
  - Specific messages for `phone_limit` and 429. A privacy line under both forms. New strings follow the Persian vocabulary guide.
- **UI:**
  - Springs use bounce 0. Validation runs on blur, and focus moves to the first invalid field. The fleet form has visible labels.
  - The booking sheet drags to dismiss with velocity projection and rubber-banding.
  - The tab bar and nav track the visible section with IntersectionObserver. The theme button reads "Appearance: X".
  - Blur is limited to the nav and tab bar, and cards are near-solid. Gradient text is static. Dead `Segmented` and CSS animations are gone. Why, FAQ and Footer are server components passed in as slots.
- **Skipped:** a scripted live attack-replay against the local backends was stopped by the safety classifier. As instructed, the model was not changed and that step was dropped. The backend and proxy regression tests cover the same behaviours.

Still to do:
1. The npm upgrade to next 16.4.0 was running at handoff. When it finishes, check that `package.json` shows 16.4.0 and run `npm audit --omit=dev`. If sharp or source-map-js are still flagged, run `npm update sharp source-map-js --no-audit`. Then commit `package.json` and `package-lock.json`.
2. Re-run `node node_modules/typescript/bin/tsc --noEmit`. The last run's errors all cascaded from npm being mid-install. Run `next build` if `free -m` shows 1.5 GB or more.
3. Run a defensive review workflow over the diff: backend correctness, proxy and CSP, infra, apple-design UI, and ponytail-review, then verify each finding.
4. Write the report with the attack tree mapped to mitigations, scan results and the performance table. Run `graphify update .`, then open the PR from `audit/security-perf-ui`.

## 3. Project map

| Path | What it is |
|---|---|
| `backend/app/main.py` | The whole FastAPI API, about 300 lines. Data is kept in memory, and charger states are simulated. |
| `backend/test_api.py` | Tests. Run with `cd backend && .venv/bin/python test_api.py`. Result at handoff: `ok`. |
| `backend/Dockerfile` | Installs from vendored wheels with `--no-index`. The `backend/wheels/` folder is not tracked in git. |
| `frontend/src/app/api/[...path]/route.ts` | Next.js route that proxies every `/api/*` call to `BACKEND_URL` on the server side. |
| `frontend/src/app/[locale]/layout.tsx` | Root layout. Has an inline theme script, fa/en with RTL, and the aurora background. |
| `frontend/src/components/landing.tsx` | Landing page: hero, live stats, network map, calculator, plans, fleet form, FAQ. |
| `frontend/src/components/reserve.tsx` | Booking sheet built on a native `<dialog>`. |
| `frontend/src/components/investors.tsx` | Investor dashboard with hand-drawn SVG charts. |
| `frontend/src/components/ui.tsx`, `nav.tsx` | Shared parts: theme toggle, language switch, segmented control, cards, top nav, mobile tab bar. |
| `frontend/src/i18n/fa.ts`, `en.ts` | All visible text. Persian wording follows the user's Persian UX vocabulary guide. |
| `frontend/src/app/globals.css` | Design tokens, glass materials, motion, and reduced-motion, transparency and contrast media queries. |
| `docker-compose.yml` | Two services. The backend is published on host port 8020, the frontend on 3020. |

API endpoints:

- `GET /api/health`
- `GET /api/network` (polled every 5 s by each open tab)
- `GET /api/hubs/{hid}/slots`
- `GET /api/financials`
- `POST /api/reservations` takes hub_id, slot, name and phone in the form `09xxxxxxxxx`.
- `POST /api/leads` takes company, kind, fleet_size and phone in the form `0xxxxxxxxxx`.

Versions: FastAPI 0.141.1, Starlette 1.7.0, Pydantic 2.13.5, Uvicorn 0.53.0, Next.js 16.3.6, React 19.2.8, Tailwind 4, motion 13.4.1.

## 4. Environment problems to know before you start

- **`python` is not on PATH, and the venv activate script is broken.** It points at an old folder, `~/Documents/Darvag/Projects/20_Tesla_Motors/backend/.venv`. Call the venv's Python by its full path:
  ```
  /home/makhataei/Projects/Mine/Iran-Supercharge-Network/backend/.venv/bin/python
  ```
- **PyPI is unreachable, so `pip install` hangs.** That means `pip-audit` and `bandit` never got installed. `npm audit` does work and reported 0 vulnerabilities.
- **The machine runs low on memory.** Several other Claude sessions run on it. The Next dev server took 48 s to start and then got killed for memory. Run `free -m` before `next dev`, `next build` or `docker build`.
- **Ports are shared with other projects.** Port 8000 belongs to another app. This project's backend was left running on `127.0.0.1:8021`. Stop it with `pkill -f "port 8021"`. Use ports 3021 and 8021 to 8049 for this project.
- **`next dev` created `frontend/AGENTS.md` and `frontend/CLAUDE.md`.** Next 16 writes these automatically. They tell agents to read `frontend/node_modules/next/dist/docs/` before writing Next code, because Next 16 changed some APIs. Keep them or delete them, and set `agentRules: false` in `next.config.ts` to stop them coming back.
- The Starlette TestClient prints a deprecation warning that suggests `httpx2`. Ignore it, since the package can't be installed offline.

Commands to run the app locally:

```
cd backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8021
cd frontend && BACKEND_URL=http://127.0.0.1:8021 node node_modules/next/dist/bin/next dev -p 3021
```

## 5. Findings so far

These are not yet verified by a second reviewer. Each one has its smallest fix and a performance note. "Checked live" means it was tested against the backend on port 8021.

### High

1. **Anyone can fill the booking store, which blocks bookings until a restart.**
   - **Where:** `main.py`, the `MAX_ROWS = 10_000` check in `reserve()` and `lead()`.
   - **Problem:** There is no rate limit, no limit per phone number, and reservations never expire.
   - **Attack:** About 10,000 POSTs make every later booking fail with `slot_full`, and every later lead fail with 429. A much smaller run, roughly 15 hubs × 8 slots × up to 8 seats, takes every slot that is open right now.
   - **Fix:**
     - Drop reservations whose slot is in the past.
     - Allow at most 2 active reservations per phone number.
     - Rate limit by client IP, for example 5 POSTs per minute.
     - Use a dictionary from IP to a deque of timestamps, kept inside the lock that already exists. No new dependency is needed.
   - **Performance:** The work per request is O(1). Clean up expired reservations once per slot change rather than on every request.

2. **The rate limit needs the real client IP, and the proxy hides it.**
   - **Where:** `route.ts`, plus the uvicorn command in `backend/Dockerfile`.
   - **Problem:** Every request reaches the backend from the frontend container, so a limit by IP would treat all users as one.
   - **Fix:** In the proxy, set `x-forwarded-for` from the incoming request. Run uvicorn with `--proxy-headers --forwarded-allow-ips=<frontend address>`. If a TLS reverse proxy sits in front, trust only that hop.

3. **The backend port is published straight to the host, so callers can skip the proxy.**
   - **Where:** `docker-compose.yml`, `ports: ["8020:8000"]`. Checked live: `/docs` and `/openapi.json` both return 200.
   - **Fix:** Remove the published port, or bind it to `127.0.0.1:8020:8000`. Turn off the API docs in production with `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)`.

### Medium

4. **Request bodies have no size limit.**
   - **Problem:** The proxy reads the whole body with `await req.text()`, and uvicorn reads it whole too. A body of hundreds of MB costs memory in both Node and Python.
   - **Fix:** In the proxy, reject with 413 when `content-length` is over about 8 KB. Also cap the body while reading it, because a chunked request has no length header. Add the same check as a small middleware in FastAPI.
   - **Performance:** Rejecting early is cheaper than parsing.

5. **The proxy has no timeout when calling the backend.**
   - **Where:** `route.ts`.
   - **Problem:** A stuck backend keeps Node connections open.
   - **Fix:** `signal: AbortSignal.any([req.signal, AbortSignal.timeout(8000)])`, and return 504 when it fires.

6. **The site sends no security headers.**
   - **Checked live:** the backend only sends `server: uvicorn`. Next adds `X-Powered-By`.
   - **Fix in `next.config.ts`:**
     - Set `poweredByHeader: false`.
     - Add a `headers()` function that sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` with `frame-ancestors 'none'`, and a `Permissions-Policy` that turns off camera, mic and geolocation.
     - Send HSTS from the TLS reverse proxy.
   - **CSP:** The inline theme script needs a sha256 hash. Next's own inline scripts need a nonce, which forces dynamic rendering and so costs performance. Start with `Content-Security-Policy-Report-Only` and decide after seeing the reports.
   - **uvicorn:** add `--no-server-header`.

7. **Reservation codes can collide and silently overwrite each other.**
   - **Where:** `main.py`, `"ISN-" + secrets.token_hex(3)`. That gives 16.7 million possible codes.
   - **Risk:** With 10,000 reservations, a collision is about 95% likely. The older reservation is lost, but its seat count stays taken.
   - **Fix:** Generate a new code until it is unused, or use `token_hex(4)`.

8. **Containers are not hardened.**
   - **Where:** `docker-compose.yml`.
   - **Fix:**
     - Add `read_only: true`, `cap_drop: [ALL]` and `security_opt: ["no-new-privileges:true"]`.
     - Add `mem_limit` and `pids_limit`.
     - Give the frontend a `tmpfs` at `/app/.next/cache` and `/tmp`.
   - **Keep the backend at one worker.** State lives in memory, so a second worker would break booking counts. Add `--limit-concurrency` and `--timeout-keep-alive 5` instead.

9. **Supply chain: images and wheels are not pinned.**
   - **Problem:** `python:3.12-slim` and `node:24-alpine` are not pinned by digest. The vendored wheels are not checked against hashes.
   - **Fix:** Pin image digests. Add hashes to `requirements.txt` and install with `pip install --require-hashes`.
   - **Also:** add `.env*` to both `.dockerignore` files and to `.gitignore`.

### Low or informational

10. **Lead IDs are sequential.** `lead()` returns `id = len(_leads)`, which leaks how many leads exist. Return a random ID or `{"ok": true}`.
11. **A name made of two spaces passes validation and is stored empty.** Add `str_strip_whitespace=True` to the model config, or strip the name before checking its length.
12. **Personal data is collected with no privacy notice.** Names and phone numbers are kept in memory only. No endpoint reads them, so the business can never see the leads, and everything is lost on restart. This is a product gap as well as a privacy one. Add a short consent line near the forms.
13. **CSRF from a plain HTML form is already blocked.**
    - **Checked live:** a `text/plain` POST to `/api/leads` returns 422.
    - **Gap:** a cross-site `fetch` that sends JSON still works, because CORS does not block the request from being sent.
    - **Fix:** In the proxy, reject POSTs whose `Sec-Fetch-Site` header is `cross-site`, or whose `Origin` doesn't match the site.
14. **422 errors echo the submitted input.** The response is JSON, so it is not an XSS risk. Optionally return a generic error in production.
15. **Things checked statically that look fine:**
    - React escapes all output, and the only `dangerouslySetInnerHTML` is a fixed string.
    - The proxy blocks `.` and `..` and always prefixes `/api/`, so it can't be pointed at other servers or paths.
    - The language switch only builds same-site paths.

### Performance items

16. **`/api/network` recomputes everything on every request.** That means 60 seeded `random.Random` objects for each poll, and every open tab polls every 5 s. The states only change every 15 s. Cache the result per 15-second tick in a small dictionary, or with `lru_cache(maxsize=2)` keyed on the tick, and recompute only the clock-based fields.
17. **API JSON is not compressed.** Checked live: `/api/network` is about 6 KB with no gzip. Add Starlette's built-in `GZipMiddleware(minimum_size=500)`. Let the proxy send `cache-control: public, max-age=5, stale-while-revalidate=10` on `GET /network` so a CDN can absorb the polling.
18. **Polling never backs off.** In `usePoll` in `src/lib/api.ts`, back off exponentially after errors. It already pauses when the tab is hidden, which is good.
19. **Heavy GPU effects on mid-range Android phones.** The page has three animated 70vmax blurred circles, a grain overlay, and `backdrop-filter: blur(24px)` on every card. Keep blur for the nav, tab bar and sheet. Make cards nearly solid, which also follows the Apple guidance against stacking translucent layers.
20. **The whole landing page is a client component.** The Why, Plans, FAQ and Footer sections don't need JavaScript. Moving them to server components would cut the JS bundle.

## 6. UI and UX items from the apple-design skill

Already done well:

- Buttons scale down on press.
- Reduced motion, reduced transparency and higher contrast all have handling.
- Numbers use tabular figures.
- The sheet enters and exits along the same path.
- RTL is handled throughout.

To do:

1. **Remove spring bounce where no gesture caused the motion.** In `ui.tsx`, `spring` has `bounce: 0.15`. Use `bounce: 0` for the segmented pill and the theme icon. Keep bounce only for flicks and drags.
2. **Validate forms as the user goes.** Errors appear only on submit. Check each field when it loses focus, and keep focus moving to the first invalid field.
3. **The fleet form uses placeholders instead of labels.** Add visible labels, like the booking form has.
4. **The booking sheet can't be dragged closed.** Add drag-to-dismiss with motion's `drag="y"`. Hand the release velocity to the spring, predict where it would land from that velocity (the skill's `project()` helper), and resist with rubber-banding at the top.
5. **The mobile tab bar never highlights the hash sections.** Network, Calculator and Plans are hash links, so they never match the current path. Track the visible section with `IntersectionObserver`.
6. **The theme toggle hides its state.** It cycles three states on one button. Consider a small menu or a segmented control.
7. **Check Persian text against the user's vocabulary guide** in `~/references/persian-ux-vocab/README.md`. The current text already follows it, for example پیش‌خوان for dashboard and نادرست for wrong. Keep it consistent in any new text.

## 7. Plan for the next session

1. Add a regression check for each fix to `backend/test_api.py`, keeping the file's plain assert style. Cover the rate limit returning 429, the 413 on oversized bodies, unique codes, and the docs being off.
2. Fix the backend, items 1, 2, 4, 7, 10, 11, 16 and 17, all in `main.py`.
3. Fix the proxy, items 2, 4, 5 and 13, in `route.ts`.
4. Add headers and config, item 6, in `next.config.ts`.
5. Fix infrastructure, items 3, 8 and 9, in `docker-compose.yml`, both Dockerfiles, `.gitignore` and the `.dockerignore` files.
6. Do the performance work, items 18 to 20, and then the UI items in section 6.
7. **Retest.** Start your own backend on a free port in 8030 to 8049, and run each attack from section 5 again. Keep load tests at 50 or fewer concurrent requests and 3,000 or fewer in total. Record p50, p95 and p99 latency before and after the caching change.
8. Run the backend tests, run `npx tsc --noEmit` in `frontend`, and run `next build` only if memory allows.

## 8. Prompt to paste into the next model

> Continue the security, pentest, performance and UI work on `/home/makhataei/Projects/Mine/Iran-Supercharge-Network`. Read `HANDOFF.md` at the repo root first. It lists the environment problems, findings 1 to 20 with fixes, the UI items, and the plan in section 7. Verify each finding against the code before fixing it. Keep the diffs small and add no new dependencies. Add one assert-style test per backend fix in `backend/test_api.py`. Use `backend/.venv/bin/python` directly, because `python` is not on PATH. Check `free -m` before running `next dev` or `next build`.
