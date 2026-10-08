export const dynamic = "force-dynamic";

const BASE = process.env.BACKEND_URL ?? "http://localhost:8000";
const MAX_BODY = 8 * 1024; // largest valid JSON body is ~250 bytes
const SEGMENT = /^[\w-]{1,40}$/; // hub ids and endpoint names only: no dots, encodings or traversal
const IP = /^[0-9a-fA-F:.]{2,45}$/;
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

/** Read at most MAX_BODY bytes, even when the client sends no content-length (chunked / HTTP/2). */
async function readBody(req: Request): Promise<string | null> {
  const declared = req.headers.get("content-length");
  if (declared && +declared > MAX_BODY) return null;
  const reader = req.body?.getReader();
  if (!reader) return "";
  const parts: Uint8Array[] = [];
  for (let n = 0; ; ) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(parts).toString("utf8");
    if ((n += value.length) > MAX_BODY) {
      reader.cancel();
      return null;
    }
    parts.push(value);
  }
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path.every((s) => SEGMENT.test(s))) return fail("bad_path", 400);
  let body: string | undefined;
  if (req.method === "POST") {
    // Every modern browser sends Sec-Fetch-Site. "cross-site" means another origin is spending this visitor's write quota.
    if (req.headers.get("sec-fetch-site") === "cross-site") return fail("cross_site", 403);
    // JSON-only also forces a CORS preflight on cross-origin fetch, which this route never answers.
    if (!req.headers.get("content-type")?.startsWith("application/json")) return fail("json_only", 415);
    const b = await readBody(req);
    if (b === null) return fail("body_too_large", 413);
    body = b;
  }
  // The edge proxy (Caddy) replaces any client-sent x-forwarded-for with the real peer, so its first hop is trustworthy.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  try {
    const up = await fetch(`${BASE}/api/${path.join("/")}`, {
      method: req.method,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(8000)]), // a stuck backend must not pin Node sockets
      cache: "no-store",
      headers: { accept: "application/json", "content-type": "application/json", ...(ip && IP.test(ip) ? { "x-forwarded-for": ip } : {}) },
      body,
    });
    const headers = new Headers({ "content-type": up.headers.get("content-type") ?? "application/json", "cache-control": up.headers.get("cache-control") ?? "no-store" });
    const retry = up.headers.get("retry-after");
    if (retry) headers.set("retry-after", retry);
    return new Response(up.body, { status: up.status, headers });
  } catch (e) {
    return (e as Error)?.name === "TimeoutError" ? fail("upstream_timeout", 504) : fail("upstream_unavailable", 502);
  }
}

export { proxy as GET, proxy as POST };
