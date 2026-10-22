// library-demo.js
// The same ideas through the real, widely used express-rate-limit package (8.x): what headers it
// sends under each standardHeaders setting, the warnings it prints about trust proxy, and how it
// keys IPv6 clients. Everything below is observed output, not the documentation's claims.
//
//   node library-demo.js

const http = require("node:http");
const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));

// Collect the library's console.error warnings while `fn` runs.
async function captureWarnings(fn) {
  const lines = [];
  const original = console.error;
  console.error = (...args) => lines.push(args.map(String).join(" "));
  try { await fn(); } finally { console.error = original; }
  return lines.flatMap((l) => l.match(/ERR_ERL_[A-Z_]+/g) ?? []);
}

// The draft-8 policy header carries a "pk" partition key (a hash that identifies the client). It is masked here only so the output is the same on every run.
const interesting = (res) => [...res.headers.entries()].filter(([name]) => /ratelimit|retry-after/i.test(name)).map(([name, value]) => [name, value.replace(/pk=:[^:]+:/, "pk=:<hash>:")]);

async function main() {
  console.log("== 1. headers under each standardHeaders setting (limit 3 per 60 s; 4 requests; legacyHeaders off)");
  for (const draft of ["draft-6", "draft-7", "draft-8"]) {
    const app = express();
    app.use(rateLimit({ windowMs: 60_000, limit: 3, standardHeaders: draft, legacyHeaders: false }));
    app.get("/", (req, res) => res.json({ ok: true }));
    const server = await listen(http.createServer(app));
    const responses = [];
    for (let i = 0; i < 4; i++) responses.push(await fetch(`http://127.0.0.1:${server.address().port}/`));
    console.log(`   ${draft}`);
    console.log(`     request 1 (${responses[0].status}): ${interesting(responses[0]).map(([n, v]) => `${n}: ${v}`).join(" | ") || "(none)"}`);
    console.log(`     request 4 (${responses[3].status}): ${interesting(responses[3]).map(([n, v]) => `${n}: ${v}`).join(" | ") || "(none)"}`);
    if (draft === "draft-6") console.log(`     the 429 body: ${JSON.stringify(await responses[3].text())}`);
    server.close();
  }

  console.log("\n== 2. what it warns about when trust proxy and X-Forwarded-For do not fit together");
  for (const [label, trustProxy] of [["trust proxy off, request carries X-Forwarded-For", undefined], ["trust proxy = true, request carries X-Forwarded-For", true]]) {
    const app = express();
    if (trustProxy !== undefined) app.set("trust proxy", trustProxy);
    app.use(rateLimit({ windowMs: 60_000, limit: 3, standardHeaders: "draft-7", legacyHeaders: false }));
    app.get("/", (req, res) => res.json({ ok: true }));
    const server = await listen(http.createServer(app));
    const warnings = await captureWarnings(async () => {
      await fetch(`http://127.0.0.1:${server.address().port}/`, { headers: { "X-Forwarded-For": "203.0.113.9" } });
    });
    console.log(`   ${label.padEnd(52)} -> ${warnings.length ? [...new Set(warnings)].join(", ") : "no warning"}`);
    server.close();
  }

  console.log("\n== 3. keying IPv6 clients: ipKeyGenerator(ip) with its default /56 subnet");
  for (const ip of ["203.0.113.9", "2001:db8:1:2::1", "2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:db8:1:ff::1", "2001:db8:1:100::1"]) {
    console.log(`   ${ip.padEnd(34)} -> ${ipKeyGenerator(ip)}`);
  }
}

main().catch((err) => {
  console.error("library-demo failed:", err);
  process.exit(1);
});
