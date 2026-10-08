// Security checks for the API proxy. Run: node "src/app/api/[...path]/route.test.ts"  (Node 24 strips the types; not --test, which globs the brackets)
import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import { after, before, test } from "node:test";

let seen: IncomingMessage | null = null;
const stub = createServer((req, res) => {
  seen = req;
  if (req.url === "/api/hang") return; // never answers: exercises the timeout
  res.writeHead(429, { "content-type": "application/json", "cache-control": "public, max-age=5", "retry-after": "7" }).end('{"detail":"x"}');
});
let call: (method: string, path: string[], init?: RequestInit) => Promise<Response>;

before(async () => {
  await new Promise<void>((ok) => stub.listen(0, "127.0.0.1", ok));
  process.env.BACKEND_URL = `http://127.0.0.1:${(stub.address() as { port: number }).port}`;
  const route = await import("./route.ts");
  call = (method, path, init = {}) => (method === "GET" ? route.GET : route.POST)(new Request("http://site/api/x", { method, ...init }), { params: Promise.resolve({ path }) });
});
after(() => stub.close());

const json = { "content-type": "application/json", "sec-fetch-site": "same-origin" };

test("path segments are allow-listed", async () => {
  for (const p of [[".."], ["a.b"], ["%2e%2e"], ["x".repeat(41)]]) assert.equal((await call("GET", p)).status, 400, p[0]);
});

test("cross-site and non-JSON writes are refused", async () => {
  assert.equal((await call("POST", ["leads"], { headers: { ...json, "sec-fetch-site": "cross-site" }, body: "{}" })).status, 403);
  assert.equal((await call("POST", ["leads"], { headers: { "content-type": "text/plain" }, body: "{}" })).status, 415);
});

test("bodies over 8 KB are refused, with or without content-length", async () => {
  assert.equal((await call("POST", ["leads"], { headers: { ...json, "content-length": "9000" }, body: "x".repeat(9000) })).status, 413);
  const chunked = new ReadableStream({ pull: (c) => c.enqueue(new Uint8Array(4096)) }); // endless stream
  assert.equal((await call("POST", ["leads"], { headers: json, body: chunked, duplex: "half" } as RequestInit)).status, 413);
});

test("forwards only a well-formed first-hop client IP and passes caching/limit headers back", async () => {
  const r = await call("POST", ["leads"], { headers: { ...json, "x-forwarded-for": "203.0.113.9, 10.0.0.1" }, body: "{}" });
  assert.equal(seen?.headers["x-forwarded-for"], "203.0.113.9");
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("retry-after"), "7");
  assert.equal(r.headers.get("cache-control"), "public, max-age=5");
  await call("POST", ["leads"], { headers: { ...json, "x-forwarded-for": "<script>" }, body: "{}" });
  assert.equal(seen?.headers["x-forwarded-for"], undefined);
});

test("a stuck backend times out with 504 instead of pinning the connection", async () => {
  assert.equal((await call("GET", ["hang"])).status, 504);
});
