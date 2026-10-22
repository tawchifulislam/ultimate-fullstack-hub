// http-demo.js
// The limiter on a real Express 5 server with the REAL clock: what a client sees when it is
// refused, what Retry-After promises, and where in the middleware chain the limiter has to sit.
//
//   node http-demo.js

const express = require("express");
const { SlidingWindowLog, TokenBucket } = require("./limiters");
const { rateLimit } = require("./rate-limit-middleware");
const { sleep } = require("./timing");

async function main() {
  const app = express();
  const work = { expensive: 0 };

  // The limiter goes FIRST, before anything that costs something (parsing, auth, the database).
  app.use("/api", rateLimit({ limiter: new SlidingWindowLog({ limit: 5, windowMs: 3000 }) }));
  app.use("/api", express.json()); // stands in for "expensive": counts how many requests got past the limiter
  app.use("/api", (req, res, next) => { work.expensive++; next(); });
  app.get("/api/hello", (req, res) => res.json({ hello: "world" }));

  // A stricter limit for one sensitive route: its own limiter, so its own count.
  app.post("/login", rateLimit({ limiter: new TokenBucket({ capacity: 2, refillPerSecond: 0.5 }) }), (req, res) => res.json({ ok: true }));

  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  console.log("== 1. 8 requests back to back against a limit of 5 per 3 seconds (sliding window log, real clock)");
  const responses = [];
  for (let i = 1; i <= 8; i++) responses.push(await fetch(`${base}/api/hello`));
  responses.forEach((r, i) => console.log(`   request ${i + 1}: ${r.status}  remaining ${r.headers.get("x-ratelimit-remaining")}  retry-after ${r.headers.get("retry-after") ?? "-"}`));
  console.log(`   the refused response in full: ${responses[5].status} ${responses[5].statusText}, content-type ${responses[5].headers.get("content-type")}, body ${await responses[5].text()}`);
  console.log(`   requests that got past the limiter to the expensive middleware: ${work.expensive} of 8`);

  console.log("\n== 2. obeying Retry-After");
  const wait = Number(responses[5].headers.get("retry-after"));
  console.log(`   waiting ${wait} s, as the 429 said...`);
  await sleep(wait * 1000);
  const again = await fetch(`${base}/api/hello`);
  console.log(`   request after the wait: ${again.status}  remaining ${again.headers.get("x-ratelimit-remaining")}`);

  console.log("\n== 3. a stricter limiter on one route (token bucket: 2 tokens, refills 1 token every 2 s)");
  const logins = [];
  for (let i = 1; i <= 4; i++) logins.push(await fetch(`${base}/login`, { method: "POST" }));
  console.log(`   4 login attempts: ${logins.map((r) => r.status).join(", ")}   (Retry-After on the first refusal: ${logins[2].headers.get("retry-after")} s)`);
  const apiStill = await fetch(`${base}/api/hello`);
  console.log(`   /api/hello at the same moment: ${apiStill.status}   (a limiter counts only the routes it is mounted on)`);

  server.close();
}

main().catch((err) => {
  console.error("http-demo failed:", err);
  process.exit(1);
});
