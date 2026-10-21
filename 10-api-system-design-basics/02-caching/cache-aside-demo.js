// cache-aside-demo.js
// Cache-aside ("lazy loading"): the app asks the cache first, and only on a miss asks the origin
// and remembers the answer. This shows the speed-up, TTL expiry, and the price of caching:
// stale data, and the two ways to deal with it (a short TTL, and invalidating on write).
//
// The origin's getProduct() is a SIMULATED 100 ms delay (see origin.js). Real waiting is used for TTLs.
//
//   node --disable-warning=ExperimentalWarning cache-aside-demo.js

const { createOrigin } = require("./origin");
const { TTLCache } = require("./ttl-cache");
const { timeAsync, makeRandom } = require("./timing");

const ms = (n) => n.toFixed(1).padStart(6);

async function main() {
  console.log("== 1. cache-aside: the first read pays for the origin, the rest do not (origin delay 100 ms, simulated)");
  {
    const origin = createOrigin({ latencyMs: 100 });
    const cache = new TTLCache({ ttlMs: 60_000 });
    for (let i = 1; i <= 5; i++) {
      const before = origin.calls.getProduct;
      const { ms: took, value } = await timeAsync(() => cache.getOrLoad("product:7", () => origin.getProduct(7)));
      console.log(`   read ${i}: ${ms(took)} ms   origin ran: ${origin.calls.getProduct > before ? "yes" : "no "}   price ${value.price}`);
    }
    console.log(`   5 reads, origin called ${origin.calls.getProduct} time(s). cache: ${JSON.stringify({ hits: cache.stats.hits, misses: cache.stats.misses })}, hit ratio ${(cache.hitRatio() * 100).toFixed(0)}%`);
  }

  console.log("\n== 2. TTL: an entry expires (TTL 300 ms, real waiting)");
  {
    const origin = createOrigin({ latencyMs: 100 });
    const cache = new TTLCache({ ttlMs: 300 });
    const read = async (label) => {
      const before = origin.calls.getProduct;
      const { ms: took } = await timeAsync(() => cache.getOrLoad("product:7", () => origin.getProduct(7)));
      console.log(`   ${label.padEnd(24)} ${ms(took)} ms   origin ran: ${origin.calls.getProduct > before ? "yes" : "no "}`);
    };
    await read("read at 0 ms");
    await read("read right after");
    await origin.sleep(350);
    await read("read after 350 ms");
    console.log(`   expirations counted by the cache: ${cache.stats.expirations}`);
  }

  console.log("\n== 3. the price of caching: stale data. The product's price changes from 17 to 999.");
  {
    // A. long TTL, no invalidation
    let origin = createOrigin({ latencyMs: 20 });
    let cache = new TTLCache({ ttlMs: 60_000 });
    const read = async () => (await cache.getOrLoad("product:7", () => origin.getProduct(7))).price;
    const first = await read();
    await origin.updateProduct(7, { price: 999 });
    console.log(`   A. TTL 60 s, no invalidation  : before ${first}, after the update the cache says ${await read()}   (origin says ${(await origin.getProduct(7)).price})`);

    // B. a short TTL bounds how stale it can get
    origin = createOrigin({ latencyMs: 20 });
    cache = new TTLCache({ ttlMs: 300 });
    const readB = async () => (await cache.getOrLoad("product:7", () => origin.getProduct(7))).price;
    await readB();
    await origin.updateProduct(7, { price: 999 });
    const staleB = await readB();
    await origin.sleep(350);
    console.log(`   B. TTL 300 ms                 : right after the update ${staleB}, 350 ms later ${await readB()}`);

    // C. delete the cached entry whenever the data is written
    origin = createOrigin({ latencyMs: 20 });
    cache = new TTLCache({ ttlMs: 60_000 });
    const readC = async () => (await cache.getOrLoad("product:7", () => origin.getProduct(7))).price;
    const updatePrice = async (price) => {
      await origin.updateProduct(7, { price });
      cache.delete("product:7"); // invalidate on write
    };
    await readC();
    await updatePrice(999);
    console.log(`   C. TTL 60 s + delete on write : right after the update ${await readC()}`);
  }

  console.log("\n== 4. a workload: 200 requests, spread evenly over 20 products (origin delay 20 ms, simulated)");
  {
    const random = makeRandom(2024);
    const ids = Array.from({ length: 200 }, () => 1 + Math.floor(random() * 20));

    const bare = createOrigin({ latencyMs: 20 });
    const t1 = await timeAsync(async () => { for (const id of ids) await bare.getProduct(id); });

    const origin = createOrigin({ latencyMs: 20 });
    const cache = new TTLCache({ ttlMs: 60_000 });
    const t2 = await timeAsync(async () => { for (const id of ids) await cache.getOrLoad(`product:${id}`, () => origin.getProduct(id)); });

    console.log(`   no cache  : origin called ${String(bare.calls.getProduct).padStart(3)} times, ${ms(t1.ms)} ms in total`);
    console.log(`   cache     : origin called ${String(origin.calls.getProduct).padStart(3)} times, ${ms(t2.ms)} ms in total, hit ratio ${(cache.hitRatio() * 100).toFixed(1)}%`);
  }
}

main().catch((err) => {
  console.error("cache-aside-demo failed:", err);
  process.exit(1);
});
