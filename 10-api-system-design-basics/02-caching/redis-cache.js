// redis-cache.js
// Cache-aside on top of Redis, in two small pieces:
//
//   RedisCache.getOrLoad()       look in Redis, on a miss run the loader and SET the answer with an expiry
//   getOrLoadLocked()            the same, but only ONE instance (of many) runs the loader at a time,
//                                using SET key value NX EX as a lock
//
// Values are stored as JSON strings: Redis stores strings and bytes, not JavaScript objects.
// Every SET carries an expiry (EX seconds). A key written without one never expires.

const { randomUUID } = require("node:crypto");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RedisCache {
  constructor(client, { prefix = "cache:", ttlSeconds = 60 } = {}) {
    this.client = client;
    this.prefix = prefix;
    this.ttlSeconds = ttlSeconds;
  }

  async get(key) {
    const text = await this.client.get(this.prefix + key);
    return text === null ? undefined : JSON.parse(text);
  }

  async set(key, value, ttlSeconds = this.ttlSeconds) {
    await this.client.set(this.prefix + key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async delete(key) {
    return (await this.client.del(this.prefix + key)) === 1;
  }

  async getOrLoad(key, loader, ttlSeconds = this.ttlSeconds) {
    const cached = await this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    if (value !== undefined) await this.set(key, value, ttlSeconds);
    return value;
  }
}

// Compare-and-delete, so an instance never releases a lock that has already expired and been
// taken by somebody else. It must be one atomic step, hence a Lua script run inside Redis.
const RELEASE_LOCK = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

// Only the instance that wins SET NX runs the loader. The others poll the cache until the
// winner has filled it. A single Redis node and a short lock expiry are fine for refreshing a
// cache entry. This is NOT a general-purpose distributed lock (not covered here).
async function getOrLoadLocked(cache, key, loader, { lockSeconds = 5, pollMs = 20, maxWaitMs = 3000 } = {}) {
  const lockKey = `${cache.prefix}lock:${key}`;
  const token = randomUUID();
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const cached = await cache.get(key);
    if (cached !== undefined) return cached;
    const won = await cache.client.set(lockKey, token, { NX: true, EX: lockSeconds });
    if (won === "OK") {
      try {
        const value = await loader();
        await cache.set(key, value);
        return value;
      } finally {
        await cache.client.eval(RELEASE_LOCK, { keys: [lockKey], arguments: [token] });
      }
    }
    await sleep(pollMs);
  }
  throw new Error(`gave up waiting for another instance to load ${key}`);
}

module.exports = { RedisCache, getOrLoadLocked, sleep };
