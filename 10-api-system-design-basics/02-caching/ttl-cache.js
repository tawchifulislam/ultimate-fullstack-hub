// ttl-cache.js
// A small in-process cache with three ideas in it:
//
//   TTL           every entry expires after ttlMs. Expired entries are dropped when they are touched.
//   LRU bound     at most maxEntries entries. When full, the least recently used one is evicted.
//                 (A Map remembers insertion order, so "re-insert on every read" keeps the
//                 least recently used key first.)
//   single-flight getOrLoad() lets only ONE loader run per key at a time. Concurrent callers for
//                 the same missing key share that one promise instead of each hitting the origin.
//
// What it stores: any value except `undefined` (get() returns undefined for a miss, so an
// undefined value could not be told apart). `null` IS cached, which is how a "not found"
// answer can be cached on purpose.

class TTLCache {
  constructor({ ttlMs = 60_000, maxEntries = Infinity, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map(); // key -> { value, expiresAt }
    this.inflight = new Map(); // key -> Promise (loads in progress)
    this.stats = { hits: 0, misses: 0, evictions: 0, expirations: 0, loads: 0, coalesced: 0 };
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return undefined;
    }
    this.entries.delete(key); // move to the end: most recently used
    this.entries.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (value === undefined) throw new TypeError("a cache cannot store undefined");
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value; // first key = least recently used
      this.entries.delete(oldest);
      this.stats.evictions++;
    }
  }

  delete(key) {
    return this.entries.delete(key);
  }

  get size() {
    return this.entries.size;
  }

  keys() {
    return [...this.entries.keys()];
  }

  hitRatio() {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  // Cache-aside: look in the cache, and on a miss run the loader and remember the answer.
  async getOrLoad(key, loader, { ttlMs = this.ttlMs, singleFlight = true } = {}) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    if (singleFlight && this.inflight.has(key)) {
      this.stats.coalesced++; // join the load already running instead of starting another
      return this.inflight.get(key);
    }

    const load = (async () => {
      this.stats.loads++;
      const value = await loader();
      if (value !== undefined) this.set(key, value, ttlMs); // a failed loader throws before this line: errors are never cached
      return value;
    })();

    if (singleFlight) {
      this.inflight.set(key, load);
      // The slot is freed whether the load succeeds or fails, so a failure does not poison the key.
      const free = () => { if (this.inflight.get(key) === load) this.inflight.delete(key); };
      load.then(free, free);
    }
    return load;
  }
}

module.exports = { TTLCache };
