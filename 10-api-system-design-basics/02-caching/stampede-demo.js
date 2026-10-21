// stampede-demo.js
// A cache stampede (also called a thundering herd): many requests ask for the same key at the
// moment it is missing (cold start) or has just expired. Each one sees a miss, and each one
// goes to the origin. The cache is supposed to protect the origin and, at that moment, does not.
//
// The fix shown here is single-flight: while one load for a key is running, every other caller
// for that key waits for the same result instead of starting its own.
//
//   node --disable-warning=ExperimentalWarning stampede-demo.js

const { createOrigin } = require("./origin");
const { TTLCache } = require("./ttl-cache");
const { timeAsync } = require("./timing");

const CALLERS = 50;
const concurrently = (n, fn) => Promise.all(Array.from({ length: n }, fn));
const ms = (n) => n.toFixed(1).padStart(7);

async function main() {
  console.log(`== 1. ${CALLERS} requests arrive together for one product (origin delay 100 ms, simulated)`);
  console.log("   (a real database slows down under that load; this simulated one does not, so the call COUNT is the evidence)");
  for (const [label, singleFlight, warm] of [
    ["cold key, no single-flight", false, false],
    ["cold key, single-flight   ", true, false],
    ["expired key, no single-flight", false, true],
    ["expired key, single-flight   ", true, true],
  ]) {
    const origin = createOrigin({ latencyMs: 100 });
    const cache = new TTLCache({ ttlMs: 200 });
    const load = () => cache.getOrLoad("product:7", () => origin.getProduct(7), { singleFlight });
    if (warm) {
      await load(); // fill it, then let it expire
      await origin.sleep(250);
    }
    const callsBefore = origin.calls.getProduct;
    const coalescedBefore = cache.stats.coalesced;
    const { ms: took } = await timeAsync(() => concurrently(CALLERS, load));
    console.log(`   ${label.padEnd(30)} origin calls: ${String(origin.calls.getProduct - callsBefore).padStart(2)}   callers that joined a load: ${String(cache.stats.coalesced - coalescedBefore).padStart(2)}   all ${CALLERS} answered in ${ms(took)} ms`);
  }

  console.log(`\n== 2. the same stampede against REAL work: a GROUP BY over 200,000 rows in SQLite (${CALLERS} callers)`);
  {
    const origin = createOrigin({ orderRows: 200_000 });
    const once = await timeAsync(async () => origin.topCustomers());
    console.log(`   one query on its own: ${ms(once.ms)} ms   top customer ${JSON.stringify(once.value[0])}`);
    for (const [label, singleFlight] of [["no single-flight", false], ["single-flight   ", true]]) {
      const cache = new TTLCache({ ttlMs: 60_000 });
      const callsBefore = origin.calls.topCustomers;
      const { ms: took } = await timeAsync(() => concurrently(CALLERS, () => cache.getOrLoad("top", async () => origin.topCustomers(), { singleFlight })));
      console.log(`   ${label}: query ran ${String(origin.calls.topCustomers - callsBefore).padStart(2)} times, ${CALLERS} callers answered after ${ms(took)} ms`);
    }
  }

  console.log("\n== 3. when the origin fails: the error is shared, and it is not cached");
  {
    const origin = createOrigin({ latencyMs: 50 });
    const cache = new TTLCache({ ttlMs: 60_000 });
    let attempts = 0;
    const flaky = async () => {
      attempts++;
      await origin.sleep(50);
      if (attempts === 1) throw new Error("origin is down");
      return { id: 7, name: "Product 7" };
    };
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => cache.getOrLoad("product:7", flaky)));
    const rejected = results.filter((r) => r.status === "rejected").length;
    console.log(`   10 callers during the outage: ${rejected} got the error "${results[0].reason?.message}", loader ran ${attempts} time(s), entries cached: ${cache.size}`);
    const retry = await cache.getOrLoad("product:7", flaky);
    console.log(`   the next call retried (loader has run ${attempts} times) and got ${JSON.stringify(retry)}, entries cached: ${cache.size}`);
  }
}

main().catch((err) => {
  console.error("stampede-demo failed:", err);
  process.exit(1);
});
