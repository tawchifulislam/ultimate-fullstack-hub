// lru-demo.js
// A cache with no size limit is a memory leak with a nice name. This shows:
//   1. how least-recently-used (LRU) eviction chooses what to throw away
//   2. an unbounded cache next to a bounded one when keys keep coming
//   3. why a small cache can still work: real traffic is skewed (a few hot keys), so the hit
//      ratio depends on the shape of the traffic and on the capacity, not on capacity alone
//
//   node --disable-warning=ExperimentalWarning lru-demo.js

const { TTLCache } = require("./ttl-cache");
const { makeRandom } = require("./timing");

console.log("== 1. LRU eviction, capacity 3 (keys listed from least to most recently used)");
{
  const cache = new TTLCache({ maxEntries: 3 });
  const show = (what) => console.log(`   ${what.padEnd(30)} keys: ${cache.keys().join(", ").padEnd(8)} evictions: ${cache.stats.evictions}`);
  cache.set("a", 1); cache.set("b", 2); cache.set("c", 3);
  show("set a, b, c");
  cache.get("a");
  show("read a");
  cache.set("d", 4);
  show("set d  (b was least recent)");
  cache.get("c");
  cache.set("e", 5);
  show("read c, set e");
  console.log(`   get("b") -> ${cache.get("b")}   (evicted, so it is a miss and the origin would be asked again)`);
}

console.log("\n== 2. 100,000 different keys arrive, one request each");
{
  const unbounded = new TTLCache();
  const bounded = new TTLCache({ maxEntries: 500 });
  for (let i = 0; i < 100_000; i++) {
    unbounded.set(`user:${i}`, { id: i });
    bounded.set(`user:${i}`, { id: i });
  }
  console.log(`   no limit        : ${String(unbounded.size).padStart(6)} entries held, ${unbounded.stats.evictions} evicted`);
  console.log(`   maxEntries 500  : ${String(bounded.size).padStart(6)} entries held, ${bounded.stats.evictions} evicted`);
}

console.log("\n== 3. hit ratio against capacity: 1,000 possible keys, 20,000 requests, LRU");
{
  const REQUESTS = 20_000;
  const KEYS = 1000;
  const traffic = {
    "even (every key equally likely)": (random) => Math.floor(random() * KEYS),
    "skewed (a few keys are hot)    ": (random) => Math.floor(KEYS * random() ** 3), // low numbers come up far more often
  };
  const capacities = [10, 50, 100, 250, 500, 1000];
  console.log(`   ${"traffic".padEnd(33)} ${capacities.map((c) => `cap ${String(c).padStart(4)}`).join("  ")}`);
  for (const [name, pick] of Object.entries(traffic)) {
    const row = capacities.map((capacity) => {
      const random = makeRandom(99); // the same request sequence for every capacity
      const cache = new TTLCache({ maxEntries: capacity });
      for (let i = 0; i < REQUESTS; i++) {
        const key = `k${pick(random)}`;
        if (cache.get(key) === undefined) cache.set(key, true); // miss: "load" and remember
      }
      return `${(cache.hitRatio() * 100).toFixed(1).padStart(6)}% `;
    });
    console.log(`   ${name} ${row.join("  ")}`);
  }
}
