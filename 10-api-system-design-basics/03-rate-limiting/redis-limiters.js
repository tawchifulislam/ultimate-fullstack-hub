// redis-limiters.js
// Rate limiters whose counters live in Redis, so every app instance shares them.
//
//   RedisFixedWindow   INCR + PEXPIRE in ONE Lua script. The window starts at the first request.
//   RedisTokenBucket   a token bucket in a Lua script, using Redis's own clock (TIME)
//   NaiveRedisLimiter  the version people write first: GET, then INCR, then PEXPIRE as separate
//                      commands. It is here to be broken (see distributed-demo.js). Do not use it.
//
// Why Lua: Redis runs a script as one uninterrupted step, so no other client's command can run in
// the middle of it. check() has the same shape as the in-memory limiters in limiters.js.

const FIXED_WINDOW = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return { count, redis.call("PTTL", KEYS[1]) }
`;

const TOKEN_BUCKET = `
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local t = redis.call("TIME")
local nowMs = t[1] * 1000 + math.floor(t[2] / 1000)
local data = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then tokens = capacity; ts = nowMs end
tokens = math.min(capacity, tokens + (nowMs - ts) / 1000 * refill)
local allowed = 0
local retry = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 else retry = math.ceil((1 - tokens) / refill * 1000) end
redis.call("HSET", KEYS[1], "tokens", tostring(tokens), "ts", tostring(nowMs))
redis.call("PEXPIRE", KEYS[1], math.ceil(capacity / refill * 1000) + 1000)
return { allowed, tostring(tokens), retry }
`;

class RedisFixedWindow {
  constructor(client, { limit, windowMs, prefix = "rl:fw:" }) {
    Object.assign(this, { client, limit, windowMs, prefix });
  }
  async check(key = "default") {
    const [count, ttl] = await this.client.eval(FIXED_WINDOW, { keys: [this.prefix + key], arguments: [String(this.windowMs)] });
    const allowed = count <= this.limit;
    return { allowed, limit: this.limit, remaining: Math.max(0, this.limit - count), retryAfterMs: allowed ? 0 : ttl };
  }
}

class RedisTokenBucket {
  constructor(client, { capacity, refillPerSecond, prefix = "rl:tb:" }) {
    Object.assign(this, { client, capacity, refillPerSecond, prefix });
  }
  async check(key = "default") {
    const [allowed, tokens, retry] = await this.client.eval(TOKEN_BUCKET, { keys: [this.prefix + key], arguments: [String(this.capacity), String(this.refillPerSecond)] });
    return { allowed: allowed === 1, limit: this.capacity, remaining: Math.floor(Number(tokens)), retryAfterMs: retry };
  }
}

class NaiveRedisLimiter {
  // crashAfterIncr: simulate the process dying between INCR and PEXPIRE.
  constructor(client, { limit, windowMs, prefix = "rl:naive:", crashAfterIncr = false }) {
    Object.assign(this, { client, limit, windowMs, prefix, crashAfterIncr });
  }
  async check(key = "default") {
    const k = this.prefix + key;
    const current = Number((await this.client.get(k)) ?? 0); // 1. read ...
    if (current >= this.limit) return { allowed: false, limit: this.limit, remaining: 0, retryAfterMs: this.windowMs };
    await this.client.incr(k); // 2. ... then write: another client may have read the same value in between
    if (this.crashAfterIncr) throw new Error("process died before PEXPIRE");
    if (current === 0) await this.client.pExpire(k, this.windowMs); // 3. and only now set the expiry
    return { allowed: true, limit: this.limit, remaining: this.limit - current - 1, retryAfterMs: 0 };
  }
}

module.exports = { RedisFixedWindow, RedisTokenBucket, NaiveRedisLimiter };
