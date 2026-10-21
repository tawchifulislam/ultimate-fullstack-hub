// redis-demo.js
// The same caching ideas against a REAL Redis server: expiry that really happens, a cache shared
// by several app instances, a lock so only one instance refreshes an entry, and a memory limit
// with an eviction policy.
//
//   node --disable-warning=ExperimentalWarning redis-demo.js
//
// Which Redis it talks to:
//   * REDIS_URL set    -> that server. Only keys starting with "topic88:" are touched, and the
//                         memory-limit section is SKIPPED (it needs FLUSHALL and CONFIG SET,
//                         which you do not want to run against a server that is not a throwaway).
//   * REDIS_URL unset  -> the script starts its own redis-server (no persistence, 127.0.0.1, a free
//                         port), uses it for everything, and stops it at the end.
//                         That needs the redis-server program on your PATH (7.0.15 was used here).

const net = require("node:net");
const { spawn } = require("node:child_process");
const { createClient } = require("redis");
const { createOrigin } = require("./origin");
const { TTLCache } = require("./ttl-cache");
const { RedisCache, getOrLoadLocked, sleep } = require("./redis-cache");
const { time } = require("./timing");

const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

async function startLocalRedis() {
  const port = await freePort();
  const child = spawn("redis-server", ["--port", String(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no"], { stdio: "ignore" });
  const failed = new Promise((_, reject) => child.on("error", (err) => reject(err.code === "ENOENT" ? new Error("redis-server was not found on your PATH. Install Redis, or set REDIS_URL to a server you can use.") : err)));
  const url = `redis://127.0.0.1:${port}`;
  const ready = (async () => {
    for (let i = 0; i < 50; i++) {
      const probe = createClient({ url, socket: { reconnectStrategy: false } });
      probe.on("error", () => {});
      try { await probe.connect(); await probe.quit(); return; } catch { await sleep(100); }
    }
    throw new Error("the local redis-server did not start");
  })();
  await Promise.race([ready, failed]);
  return { url, stop: () => child.kill() };
}

async function connect(url) {
  const client = createClient({ url });
  client.on("error", (err) => console.error("redis client error:", err.message));
  await client.connect();
  return client;
}

const ms = (n) => n.toFixed(3);

async function main() {
  const local = process.env.REDIS_URL ? null : await startLocalRedis();
  const url = process.env.REDIS_URL || local.url;
  const client = await connect(url);
  const version = (await client.info("server")).match(/redis_version:(\S+)/)[1];
  console.log(`redis ${version}, ${local ? "started by this script" : "your REDIS_URL"}\n`);

  try {
    console.log("== 1. expiry is real (SET ... EX 2)");
    const cache = new RedisCache(client, { prefix: "topic88:" });
    await cache.set("price:7", { id: 7, price: 17 }, 2);
    console.log(`   right after SET        : TTL ${await client.ttl("topic88:price:7")} s, value ${JSON.stringify(await cache.get("price:7"))}`);
    await sleep(2300);
    console.log(`   2.3 s later            : TTL ${await client.ttl("topic88:price:7")} (-2 means the key is gone), value ${JSON.stringify(await cache.get("price:7"))}`);
    await client.set("topic88:forever", "x");
    console.log(`   SET with no EX         : TTL ${await client.ttl("topic88:forever")} (-1 means it never expires)`);

    // How much does the network hop cost, even on localhost? The same read from a Map in this process, and from Redis.
    const local1 = new TTLCache();
    local1.set("k", { id: 1 });
    await cache.set("k", { id: 1 });
    const N = 1000;
    const inProcess = time(() => { for (let i = 0; i < N; i++) local1.get("k"); });
    const startRedis = process.hrtime.bigint();
    for (let i = 0; i < N; i++) await cache.get("k");
    const redisMs = Number(process.hrtime.bigint() - startRedis) / 1e6;
    console.log(`   ${N} reads of one key  : in-process cache ${ms(inProcess.ms)} ms in total, Redis on localhost ${ms(redisMs)} ms in total (${ms(redisMs / N)} ms each; a real network adds more)`);

    console.log("\n== 2. two app instances, one product: in-process caches against one shared Redis");
    {
      // Instance A and B each have a private in-process cache. A handles the price change.
      const origin = createOrigin({ latencyMs: 20 });
      const a = new TTLCache({ ttlMs: 60_000 });
      const b = new TTLCache({ ttlMs: 60_000 });
      const read = (instance) => instance.getOrLoad("product:7", () => origin.getProduct(7));
      await read(a); await read(b);
      await origin.updateProduct(7, { price: 999 });
      a.delete("product:7"); // instance A invalidates ITS cache; B cannot hear it
      console.log(`   in-process caches : origin loads ${origin.calls.getProduct}, after the update A reads ${(await read(a)).price}, B reads ${(await read(b)).price}   (origin says 999)`);
    }
    {
      // Instance A and B share one Redis key.
      const origin = createOrigin({ latencyMs: 20 });
      const a = new RedisCache(client, { prefix: "topic88:shared:" });
      const b = new RedisCache(await connect(url), { prefix: "topic88:shared:" });
      const read = (instance) => instance.getOrLoad("product:7", () => origin.getProduct(7));
      await read(a); await read(b);
      await origin.updateProduct(7, { price: 999 });
      await a.delete("product:7"); // the same key is gone for everybody
      console.log(`   shared Redis      : origin loads ${origin.calls.getProduct}, after the update A reads ${(await read(a)).price}, B reads ${(await read(b)).price}   (origin says 999)`);
      await b.client.quit();
    }

    console.log("\n== 3. ten instances miss the same key at the same moment (origin delay 100 ms, simulated)");
    for (const locked of [false, true]) {
      const origin = createOrigin({ latencyMs: 100 });
      const clients = await Promise.all(Array.from({ length: 10 }, () => connect(url)));
      const caches = clients.map((c) => new RedisCache(c, { prefix: `topic88:herd${locked ? "L" : "N"}:` }));
      const load = () => origin.getProduct(7);
      const answers = await Promise.all(caches.map((c) => (locked ? getOrLoadLocked(c, "product:7", load) : c.getOrLoad("product:7", load))));
      console.log(`   ${locked ? "with a SET NX lock   " : "plain cache-aside    "}: origin calls ${String(origin.calls.getProduct).padStart(2)}, all 10 instances got ${new Set(answers.map((x) => x.name)).size === 1 ? "the same answer" : "different answers"}`);
      await Promise.all(clients.map((c) => c.quit()));
    }

    console.log("\n== 4. memory is finite: maxmemory and an eviction policy");
    if (!local) {
      console.log("   skipped: this section needs CONFIG SET and FLUSHALL, so it only runs against the Redis this script starts itself.");
    } else {
      const usedMemory = async () => Number((await client.info("memory")).match(/used_memory:(\d+)/)[1]);
      const stat = async (name) => Number((await client.info("stats")).match(new RegExp(`${name}:(\\d+)`))[1]);
      const value = "x".repeat(500);
      const WRITES = 20_000;

      await client.flushAll();
      const headroom = 2 * 1024 * 1024;
      await client.configSet("maxmemory", String((await usedMemory()) + headroom));
      await client.configSet("maxmemory-policy", "allkeys-lru");
      const evictedBefore = await stat("evicted_keys");
      for (let i = 0; i < WRITES; i++) await client.set(`topic88:k${i}`, value, { EX: 600 });
      const held = await client.dbSize();
      const evicted = (await stat("evicted_keys")) - evictedBefore;
      console.log(`   allkeys-lru : ${WRITES} writes of ~500 bytes into ~2 MB of room -> all accepted, keys held ${held}, evicted_keys ${evicted}`);
      const survivors = async (from, to) => client.exists(Array.from({ length: to - from }, (_, i) => `topic88:k${from + i}`));
      console.log(`                 of the first 1000 keys written, ${await survivors(0, 1000)} are still there; of the last 1000 keys written, ${await survivors(WRITES - 1000, WRITES)} are`);

      await client.flushAll();
      await client.configSet("maxmemory", String((await usedMemory()) + headroom));
      await client.configSet("maxmemory-policy", "noeviction");
      let written = 0;
      let failure = null;
      for (let i = 0; i < WRITES && !failure; i++) {
        try { await client.set(`topic88:k${i}`, value, { EX: 600 }); written++; } catch (err) { failure = err; }
      }
      console.log(`   noeviction  : ${written} writes accepted, then the write failed with: ${failure ? failure.message : "(no failure)"}`);
    }

    // clean up only what this script created
    const keys = await client.keys("topic88:*");
    if (keys.length) await client.del(keys);
  } finally {
    await client.quit();
    if (local) local.stop();
  }
}

main().catch((err) => {
  console.error("redis-demo failed:", err.message);
  process.exit(1);
});
