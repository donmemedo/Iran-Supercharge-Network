export const dynamic = "force-dynamic";

const BASE = process.env.BACKEND_URL ?? "http://localhost:8000";

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.some((s) => s === "." || s === "..")) return Response.json({ error: "bad_path" }, { status: 400 });
  const { search } = new URL(req.url);
  try {
    const up = await fetch(`${BASE}/api/${path.map(encodeURIComponent).join("/")}${search}`, {
      method: req.method,
      signal: req.signal,
      cache: "no-store",
      headers: { accept: "application/json", "content-type": req.headers.get("content-type") ?? "application/json" },
      body: req.method === "GET" ? undefined : await req.text(),
    });
    return new Response(up.body, { status: up.status, headers: { "content-type": up.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST };
