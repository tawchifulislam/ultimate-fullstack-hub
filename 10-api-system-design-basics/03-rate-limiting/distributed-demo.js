// distributed-demo.js
// Rate limiting across several app instances. Four problems and their fixes, against a real Redis:
//
//   1. each instance has its own in-memory counter, so N instances allow N times the limit
//   2. a limiter built from GET then INCR lets a burst of concurrent requests straight through
//   3. a key that was INCRed but never given an expiry blocks a client for good
//   4. a token bucket in Redis (Lua), correct under concurrency, with its own cleanup
//
//   node distributed-demo.js
//
// Needs redis-server on your PATH (it starts its own), or set REDIS_URL. See redis-local.js.

const http = require("node:http");
const express = require("express");
const { SlidingWindowLog } = require("./limiters");
const { RedisFixedWindow, RedisTokenBucket, NaiveRedisLimiter } = require("./redis-limiters");
const { rateLimit } = require("./rate-limit-middleware");
const { startLocalRedis, connect, sleep } = require("./redis-local");

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
const instance = (limiter) => {
  const app = express();
  app.get("/api", rateLimit({ limiter, key: () => "one-client" }), (req, res) => res.json({ ok: true }));
  return listen(http.createServer(app));
};

async function main() {
  const redis = await startLocalRedis();
  const client = await connect(redis.url);
  const version = (await client.info("server")).match(/redis_version:(\S+)/)[1];
  console.log(`redis ${version}${redis.own ? ", started by this script" : ", from REDIS_URL"}\n`);

  try {
    console.log("== 1. one client sends 30 requests, round-robin across 3 app instances. The limit is 5 per minute.");
    for (const kind of ["in-memory limiter in each instance", "one shared Redis limiter           "]) {
      const servers = [];
      const shared = new RedisFixedWindow(client, { limit: 5, windowMs: 60_000, prefix: "demo1:" });
      for (let i = 0; i < 3; i++) servers.push(await instance(kind.startsWith("in-memory") ? new SlidingWindowLog({ limit: 5, windowMs: 60_000 }) : shared));
      let allowed = 0;
      for (let i = 0; i < 30; i++) {
        const res = await fetch(`http://127.0.0.1:${servers[i % 3].address().port}/api`);
        if (res.status === 200) allowed++;
      }
      console.log(`   ${kind}: ${String(allowed).padStart(2)} of 30 allowed`);
      servers.forEach((s) => s.close());
    }

    console.log("\n== 2. 50 requests arrive at the same moment (spread over 10 connections). The limit is 10.");
    const clients = await Promise.all(Array.from({ length: 10 }, () => connect(redis.url)));
    for (const [name, make] of [
      ["GET, then INCR (not atomic)         ", (c, i) => new NaiveRedisLimiter(c, { limit: 10, windowMs: 60_000, prefix: "demo2n:" })],
      ["one Lua script: INCR + PEXPIRE      ", (c, i) => new RedisFixedWindow(c, { limit: 10, windowMs: 60_000, prefix: "demo2a:" })],
    ]) {
      const results = await Promise.all(Array.from({ length: 50 }, (_, i) => make(clients[i % 10], i).check("same-client")));
      console.log(`   ${name}: ${String(results.filter((r) => r.allowed).length).padStart(2)} of 50 allowed`);
    }

    console.log("\n== 3. the process dies between INCR and PEXPIRE (limit 3 per 0.5 s window)");
    {
      const crashing = new NaiveRedisLimiter(client, { limit: 3, windowMs: 500, prefix: "demo3n:", crashAfterIncr: true });
      await crashing.check("u").catch((err) => console.log(`   first request: ${err.message}`));
      const naive = new NaiveRedisLimiter(client, { limit: 3, windowMs: 500, prefix: "demo3n:" });
      console.log(`   the key now: ${await client.get("demo3n:u")} request counted, PTTL ${await client.pTTL("demo3n:u")} (-1 means no expiry)`);
      const burst = [];
      for (let i = 0; i < 4; i++) burst.push((await naive.check("u")).allowed);
      await sleep(700);
      const later = (await naive.check("u")).allowed;
      console.log(`   next 4 requests allowed: ${burst.join(", ")}; 0.7 s later (the window was 0.5 s): allowed ${later}, PTTL still ${await client.pTTL("demo3n:u")}`);
      const atomic = new RedisFixedWindow(client, { limit: 3, windowMs: 500, prefix: "demo3a:" });
      await atomic.check("u");
      console.log(`   with the Lua script, right after the first request: PTTL ${await client.pTTL("demo3a:u") > 0 ? "> 0 (it will expire)" : "not set"}`);
      await sleep(700);
      console.log(`   0.7 s later: allowed ${(await atomic.check("u")).allowed}`);
    }

    console.log("\n== 4. a token bucket in Redis (capacity 5, refills 1 token per second)");
    {
      const bucket = new RedisTokenBucket(client, { capacity: 5, refillPerSecond: 1, prefix: "demo4:" });
      const first = [];
      let lastRetry = 0;
      for (let i = 0; i < 8; i++) { const r = await bucket.check("a"); first.push(r.allowed); lastRetry = r.retryAfterMs; }
      console.log(`   8 requests back to back: ${first.map((a) => (a ? "yes" : "no")).join(" ")}   (retry after about ${Math.round(lastRetry)} ms)`);
      await sleep(1100);
      console.log(`   1.1 s later, one more: ${(await bucket.check("a")).allowed ? "yes" : "no"}`);
      const results = await Promise.all(Array.from({ length: 20 }, (_, i) => new RedisTokenBucket(clients[i % 10], { capacity: 5, refillPerSecond: 1, prefix: "demo4:" }).check("fresh")));
      console.log(`   20 concurrent requests on a fresh bucket: ${results.filter((r) => r.allowed).length} allowed`);
      console.log(`   the bucket cleans itself up: PTTL ${(await client.pTTL("demo4:a")) > 0 ? "> 0 (the key expires on its own)" : "not set"}`);
    }

    await Promise.all(clients.map((c) => c.quit()));
  } finally {
    await client.quit();
    redis.stop();
  }
}

main().catch((err) => {
  console.error("distributed-demo failed:", err);
  process.exit(1);
});
