// limiters.js
// Four rate limiting algorithms as small in-memory classes with the same interface:
//
//   limiter.check(key)  ->  { allowed, limit, remaining, retryAfterMs }
//
// Every limiter takes an injectable clock, now() in milliseconds, so the demos can replay exact
// traffic traces with a fake clock instead of sleeping. Time never moves on its own here.
//
//   FixedWindow           count requests per clock-aligned window; the count resets when a new window starts
//   SlidingWindowLog      remember the timestamp of every accepted request in the last windowMs
//   SlidingWindowCounter  remember only two counts (previous window, current window) and weight the previous one
//   TokenBucket           a bucket of `capacity` tokens that refills at `refillPerSecond`; each request takes one
//
// Each also has size (keys being tracked), stateNumbers(key) (how many numbers are stored for a key)
// and sweep() (forget keys that have nothing left to remember).

class FixedWindow {
  constructor({ limit, windowMs, now = Date.now }) {
    Object.assign(this, { limit, windowMs, now });
    this.state = new Map(); // key -> { window, count }
  }
  check(key = "default") {
    const t = this.now();
    const window = Math.floor(t / this.windowMs);
    let s = this.state.get(key);
    if (!s || s.window !== window) {
      s = { window, count: 0 };
      this.state.set(key, s);
    }
    const retryAfterMs = (window + 1) * this.windowMs - t;
    if (s.count >= this.limit) return { allowed: false, limit: this.limit, remaining: 0, retryAfterMs };
    s.count++;
    return { allowed: true, limit: this.limit, remaining: this.limit - s.count, retryAfterMs: 0 };
  }
  get size() { return this.state.size; }
  stateNumbers(key) { return this.state.has(key) ? 2 : 0; }
  sweep() {
    const window = Math.floor(this.now() / this.windowMs);
    for (const [key, s] of this.state) if (s.window !== window) this.state.delete(key);
  }
}

class SlidingWindowLog {
  constructor({ limit, windowMs, now = Date.now }) {
    Object.assign(this, { limit, windowMs, now });
    this.state = new Map(); // key -> [timestamps of accepted requests, oldest first]
  }
  check(key = "default") {
    const t = this.now();
    const log = this.state.get(key) ?? [];
    while (log.length && log[0] <= t - this.windowMs) log.shift(); // forget what slid out of the window
    this.state.set(key, log);
    if (log.length >= this.limit) {
      return { allowed: false, limit: this.limit, remaining: 0, retryAfterMs: log[0] + this.windowMs - t };
    }
    log.push(t);
    return { allowed: true, limit: this.limit, remaining: this.limit - log.length, retryAfterMs: 0 };
  }
  get size() { return this.state.size; }
  stateNumbers(key) { return this.state.get(key)?.length ?? 0; }
  sweep() {
    const t = this.now();
    for (const [key, log] of this.state) {
      while (log.length && log[0] <= t - this.windowMs) log.shift();
      if (!log.length) this.state.delete(key);
    }
  }
}

class SlidingWindowCounter {
  constructor({ limit, windowMs, now = Date.now }) {
    Object.assign(this, { limit, windowMs, now });
    this.state = new Map(); // key -> { window, current, previous }
  }
  // Estimated requests in the last windowMs = previous window's count, weighted by how much of
  // that window is still inside the sliding window, plus the current window's count.
  check(key = "default") {
    const t = this.now();
    const window = Math.floor(t / this.windowMs);
    let s = this.state.get(key);
    if (!s) s = { window, current: 0, previous: 0 };
    if (s.window !== window) {
      s = { window, current: 0, previous: s.window === window - 1 ? s.current : 0 };
    }
    this.state.set(key, s);
    const elapsed = t - window * this.windowMs;
    const estimate = s.previous * ((this.windowMs - elapsed) / this.windowMs) + s.current;
    if (estimate + 1 > this.limit) {
      return { allowed: false, limit: this.limit, remaining: 0, retryAfterMs: this.windowMs - elapsed }; // an upper bound: the next window
    }
    s.current++;
    return { allowed: true, limit: this.limit, remaining: Math.max(0, Math.floor(this.limit - (estimate + 1))), retryAfterMs: 0 };
  }
  get size() { return this.state.size; }
  stateNumbers(key) { return this.state.has(key) ? 3 : 0; }
  sweep() {
    const window = Math.floor(this.now() / this.windowMs);
    for (const [key, s] of this.state) if (s.window < window - 1) this.state.delete(key);
  }
}

class TokenBucket {
  constructor({ capacity, refillPerSecond, now = Date.now }) {
    Object.assign(this, { capacity, refillPerSecond, now });
    this.state = new Map(); // key -> { tokens, last }
  }
  check(key = "default") {
    const t = this.now();
    let s = this.state.get(key);
    if (!s) s = { tokens: this.capacity, last: t }; // a new key starts with a full bucket
    s.tokens = Math.min(this.capacity, s.tokens + ((t - s.last) / 1000) * this.refillPerSecond);
    s.last = t;
    this.state.set(key, s);
    if (s.tokens < 1) {
      return { allowed: false, limit: this.capacity, remaining: 0, retryAfterMs: ((1 - s.tokens) / this.refillPerSecond) * 1000 };
    }
    s.tokens -= 1;
    return { allowed: true, limit: this.capacity, remaining: Math.floor(s.tokens), retryAfterMs: 0 };
  }
  get size() { return this.state.size; }
  stateNumbers(key) { return this.state.has(key) ? 2 : 0; }
  sweep() {
    const t = this.now();
    for (const [key, s] of this.state) {
      // a bucket that would be full again carries no information: forget it
      if (s.tokens + ((t - s.last) / 1000) * this.refillPerSecond >= this.capacity) this.state.delete(key);
    }
  }
}

module.exports = { FixedWindow, SlidingWindowLog, SlidingWindowCounter, TokenBucket };
