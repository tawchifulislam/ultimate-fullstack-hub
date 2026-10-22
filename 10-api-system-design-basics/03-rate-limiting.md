# Rate Limiting

**Topic 89 of 89** (Section: API / System Design Basics, 3 of 3)

## Notes

### Project structure

```text
limiters.js               -> four in-memory algorithms with one interface: fixed window, sliding window log, sliding window counter, token bucket
rate-limit-middleware.js  -> Express middleware that turns any limiter into a 429 with Retry-After
timing.js                 -> a deterministic random generator and a sleep helper
algorithms-demo.js        -> the four algorithms fed the same traffic with a fake clock: the boundary burst, steady load, accuracy, memory
http-demo.js              -> the limiter on a real Express 5 server: the 429, Retry-After, middleware order, per-route limits
proxy-ip-demo.js          -> five trust proxy setups, an attacker who forges X-Forwarded-For, and an innocent user
login-demo.js             -> brute-forcing a login against real scrypt hashing, with no limiter, a per-IP limiter and a per-account limiter
redis-local.js            -> starts a throwaway redis-server for the demos and connects clients
redis-limiters.js         -> Redis limiters: a fixed window and a token bucket in Lua, and the naive version that breaks
distributed-demo.js       -> three app instances, a burst of concurrent requests, a key that never expires, a token bucket in Redis
library-demo.js           -> the real express-rate-limit package: its headers, its warnings, its IPv6 keys
package.json
```

**Rate limiting** puts a ceiling on how often one client may do something: a budget per key (an IP, a user, an API key) per period of time, and a refusal when the budget is gone. It protects the server from overload and cost, other users from one noisy neighbor, and accounts from guessing. OWASP lists the lack of such limits as API4:2023, Unrestricted Resource Consumption: an API without them can be taken down or made expensive by a client that simply asks too much. This topic builds on Topic 88, because the shared counters live in the same Redis (and the same TTL and atomicity lessons apply), on Topic 87, because a hard cap on the page size is a limit on how much one request may ask for, and on Topic 84, because every password guess costs the server real CPU time, which is exactly what a limiter protects. It is the last topic of the roadmap.

Every result below was run on Node 22.22.0 with Express 5.3.0, express-rate-limit 8.7.1, the `redis` npm client 5.12.1 against a real Redis server 7.0.15 (started by the script on `127.0.0.1`), and Node's built-in `crypto.scrypt`. No browser was used. The algorithm comparison uses a **fake clock** (time only moves when the script moves it), so it never sleeps and its numbers are identical on every run. The server, proxy, login and Redis demos use the **real clock**, and their timings move from run to run: compare numbers inside one table with each other, not with the numbers on your machine.

### The four algorithms

`limiters.js` has four limiters with the same interface, `check(key)`, which returns `{ allowed, limit, remaining, retryAfterMs }`. Each takes an injectable clock.

| Algorithm | What it remembers per key | How it decides |
| --- | --- | --- |
| **Fixed window** | A window number and a count | Count requests in clock-aligned windows ("this minute"); the count resets when the next window starts |
| **Sliding window log** | The timestamp of every accepted request in the window | Drop timestamps older than the window; refuse if `limit` remain |
| **Sliding window counter** | Two counts (previous window and current window) | Estimate = previous count weighted by how much of that window still overlaps, plus the current count |
| **Token bucket** | A token count and the time it was last refilled | A bucket holds up to `capacity` tokens and refills at a steady rate; a request takes one token or is refused |

The token bucket's core, in `limiters.js`:

```js
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
```

#### The boundary burst

The limit is 10 requests per 10 seconds. A client sends 10 requests at 9.9 seconds (the end of the first window) and 10 more at 10.1 seconds (the start of the next):

```text
1. the boundary burst: limit 10 per 10 s. 10 requests at 9.9 s, then 10 more at 10.1 s (0.2 s apart)
   fixed window       : accepted 10 then 10   = 20 in 0.2 s
   sliding window log : accepted 10 then  0   = 10 in 0.2 s
   sliding win counter: accepted 10 then  0   = 10 in 0.2 s
   token bucket       : accepted 10 then  0   = 10 in 0.2 s
```

**Verified directly.** The fixed window let 20 requests through in 0.2 seconds, twice the limit, because each batch landed in a different window. The other three did not. That is the standard weakness of the fixed window: it is the simplest and cheapest, and its worst case is double the limit around every window boundary.

#### A client that keeps asking

A client sends 2 requests per second for 60 seconds (120 requests) against 10 per 10 seconds, so about 60 should get through:

```text
2. a client sends 2 requests per second for 60 s (120 requests); the limit is 10 per 10 s, so about 60 should get through
   fixed window       : accepted  60 of 120
   sliding window log : accepted  60 of 120
   sliding win counter: accepted  55 of 120
   token bucket       : accepted  69 of 120
```

The token bucket accepted 69 because it starts full: its capacity of 10 is an **allowed burst**, after which it settles to the refill rate (10 + about 59 refilled tokens). That is a feature, not a bug: a client that has been quiet may send a short burst. Stripe's engineering write-up says it uses the token bucket algorithm for rate limiting. The sliding window counter accepted 55, which leads to its trade-off.

#### The sliding window counter is an approximation

The counter assumes the previous window's requests were spread evenly. Cloudflare's write-up describes the same weighted estimate (for example 42 requests in the previous minute and 18 in the current one, 15 seconds in, gives about 49.5) and reports, from its own test on 400 million requests from 270,000 sources, an average difference of 6% between the real rate and the approximate rate (and 0.003% of requests wrongly allowed or limited). Here it is compared with the exact log on 100,000 requests at random times. "Busiest 10 s" is the most requests a limiter accepted inside any single 10-second window (the limit is 10):

```text
3. sliding window counter against the exact sliding window log: 100,000 requests at random times
   a heavy client (mean gap 700 ms) : log accepted 60886 (busiest 10 s: 10), counter accepted 59257 (busiest 10 s: 15), -2.7% difference
   a client near the limit (1100 ms): log accepted 82448 (busiest 10 s: 10), counter accepted 81973 (busiest 10 s: 14), -0.6% difference
```

**Verified directly.** In this run the counter accepted fewer requests overall (2.7% and 0.6% fewer), but in some 10-second windows it let through 14 or 15 against a limit of 10. The log never exceeded 10. The counter is cheap and close, and not exact. Choose it when a small overshoot is acceptable. The price of the exact log is memory:

```text
4. memory: numbers stored for ONE key after 1,000 requests (limit 1000 per 60 s)
   fixed window       :    2 numbers
   sliding window log : 1000 numbers
   sliding win counter:    3 numbers
   token bucket       :    2 numbers
```

The log stores up to `limit` numbers per key, so a limit of 1000 per minute costs 1000 numbers for every client. The other three store 2 or 3 numbers per key whatever the limit is.

#### Forgetting clients

Every in-memory limiter keeps a map from key to state, and a key is added for every client that ever shows up. A limiter that never forgets grows without bound, the same problem as an unbounded cache in Topic 88:

```text
5. 10,000 different clients make one request each, then go quiet: keys being tracked
   fixed window       : 10000 keys held,     0 after sweep()
   sliding window log : 10000 keys held,     0 after sweep()
   sliding win counter: 10000 keys held,     0 after sweep()
   token bucket       : 10000 keys held,     0 after sweep()
```

**Verified directly.** 10,000 clients left 10,000 entries behind, and `sweep()` cleared them once their windows or buckets had recovered. In the demos nothing calls `sweep()` on a timer. A real in-memory limiter needs one (or a store that expires keys by itself, as Redis does below).

### Sending the 429

When the budget is gone the server answers `429 Too Many Requests`. RFC 6585 defines the status, says the response MAY include a `Retry-After` header, and says a 429 response must not be stored by a cache. MDN describes `Retry-After` as either a number of seconds or an HTTP date. `rate-limit-middleware.js` wraps any limiter:

```js
      const result = await limiter.check(key(req));
      res.set("X-RateLimit-Limit", String(result.limit));
      res.set("X-RateLimit-Remaining", String(result.remaining));
      if (result.allowed) return next();
      const retryAfter = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ error: "too_many_requests", retryAfterSeconds: retryAfter });
```

On a real Express 5 server with the real clock, a limit of 5 per 3 seconds and 8 requests back to back:

```text
1. 8 requests back to back against a limit of 5 per 3 seconds (sliding window log, real clock)
   request 1: 200  remaining 4  retry-after -
   request 2: 200  remaining 3  retry-after -
   request 3: 200  remaining 2  retry-after -
   request 4: 200  remaining 1  retry-after -
   request 5: 200  remaining 0  retry-after -
   request 6: 429  remaining 0  retry-after 3
   request 7: 429  remaining 0  retry-after 3
   request 8: 429  remaining 0  retry-after 3
   the refused response in full: 429 Too Many Requests, content-type application/json; charset=utf-8, body {"error":"too_many_requests","retryAfterSeconds":3}
   requests that got past the limiter to the expensive middleware: 5 of 8
```

A client that obeys the header comes back after the wait:

```text
2. obeying Retry-After
   waiting 3 s, as the 429 said...
   request after the wait: 200  remaining 4
```

**Verified directly.** Waiting the number of seconds the 429 asked for was enough to be let in again. The limiter is mounted **first**, before the JSON parser and the "expensive" middleware, so only 5 of the 8 requests ever reached that middleware. A limiter placed after the parsing, authentication or database work would protect nothing, because the cost had already been paid by the time it refused.

A sensitive route can have a stricter limiter of its own. This login route uses a token bucket with 2 tokens and a refill of one token every 2 seconds, and the limiter counts only the routes it is mounted on:

```text
3. a stricter limiter on one route (token bucket: 2 tokens, refills 1 token every 2 s)
   4 login attempts: 200, 200, 429, 429   (Retry-After on the first refusal: 2 s)
   /api/hello at the same moment: 200   (a limiter counts only the routes it is mounted on)
```

#### Which headers to send

`Retry-After` is standard. The `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers in this middleware are a widespread convention and not a standard. The IETF is working on one: the Internet-Draft "RateLimit header fields for HTTP" (draft-ietf-httpapi-ratelimit-headers) was at version 11 (dated 23 May 2026), an active working group document and not yet an RFC, when I looked. It defines two fields, `RateLimit-Policy` and `RateLimit`, and does not define `RateLimit-Limit`, `RateLimit-Remaining` or `RateLimit-Reset`. Its text lists `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` among the headers already in use and notes that implementations interpret them inconsistently (for example the reset value as seconds, milliseconds or a timestamp). Because the draft has changed between versions, libraries offer several formats. The next sections show what express-rate-limit actually sends.

### Who is the client? Keys and `req.ip`

A limiter needs a **key**: the thing that has the budget. The usual choices, and what each gets wrong:

| Key | Good for | What goes wrong |
| --- | --- | --- |
| IP address | Anonymous traffic, login attempts before the user is known | Many users behind one address (an office, a mobile carrier) share one budget. One person can have many addresses |
| User id | Logged-in traffic | Useless before login, and useless for the login route itself |
| API key | Third-party clients | A leaked key shares its budget with its thief |
| Account name | Login attempts for one account | Lets an attacker lock a real user out (shown below) |

Keying by IP depends on what `req.ip` contains, and in Express that depends on the `trust proxy` setting. The Express documentation lists the values: `false` is the default (the app is treated as directly facing the client, and the address comes from the socket), `true` takes the **left-most** entry of `X-Forwarded-For` (and warns that the last trusted proxy must remove or overwrite that header, or clients can supply any value), and a number `n` uses the address at most `n` hops away from the app (`req.socket.remoteAddress` is the first hop, and the rest are read from `X-Forwarded-For` from right to left). The docs also list a form that takes trusted addresses or subnets, which this topic did not run. `proxy-ip-demo.js` tries five setups. The "different clients" are real: the harness binds its sockets to `127.0.0.2` (an attacker) and `127.0.0.3` (an innocent user), and the proxy is a short reverse proxy in the file that **appends** the address it saw to `X-Forwarded-For` and does not remove what the client sent. The app sets the option with:

```js
if (trustProxy !undefined) app.set("trust proxy", trustProxy);
```

The limit is 3 requests per minute per `req.ip`. The attacker sends 8 requests, each with a different made-up `X-Forwarded-For`, and then the innocent user sends one request:

```text
   setup                                      attacker allowed   req.ip seen for attacker     innocent user
   A. direct, trust proxy off (the default)    3 of 8          127.0.0.2                   200 ok
   B. direct, trust proxy = true               8 of 8          8 different, e.g. 10.9.8.1  200 ok
   C. behind a proxy, trust proxy off          3 of 8          127.0.0.1                   429 refused
   D. behind a proxy, trust proxy = 1          3 of 8          127.0.0.2                   200 ok
   E. behind a proxy, trust proxy = true       8 of 8          8 different, e.g. 10.9.8.1  200 ok
```

**Verified directly.** The two ways to get it wrong are opposites, and both are real:

- **Trust too much (B and E).** With `trust proxy = true`, the left-most `X-Forwarded-For` entry is whatever the client wrote. The attacker got a fresh bucket for every request and was never limited: 8 of 8. In E a proxy was present, and it still did not help, because it appended to the header instead of replacing it.
- **Trust too little (C).** Behind a proxy with `trust proxy` off, `req.ip` is the **proxy's** address for everyone. The attacker used up the one shared bucket and the innocent user, who had done nothing, was refused.

The right setup was D: the app trusts exactly the number of proxies that really exist (`1`), reads the entry the proxy added, and ignores anything the client put before it. The attacker was limited to 3, and the innocent user was unaffected. The number must match your real deployment.

IPv6 adds a second problem: one person may control a huge range of addresses, so limiting each full address separately does little. express-rate-limit 8.7.1 exports an `ipKeyGenerator` helper that, by default, maps an IPv6 address to its **/56 subnet**, so every address in the same /56 shares one key:

```text
3. keying IPv6 clients: ipKeyGenerator(ip) with its default /56 subnet
   203.0.113.9                        -> 203.0.113.9
   2001:db8:1:2::1                    -> 2001:db8:1::/56
   2001:db8:1:2:aaaa:bbbb:cccc:dddd   -> 2001:db8:1::/56
   2001:db8:1:ff::1                   -> 2001:db8:1::/56
   2001:db8:1:100::1                  -> 2001:db8:1:100::/56
```

That shows the helper's output for five addresses. Real IPv6 traffic through the network was not tested, and I did not check which key generator the middleware uses when you do not pass one.

### Throttling a login

A login route is where rate limiting meets Topic 84. Hashing passwords on purpose is slow, and each guess costs the server that time. `login-demo.js` runs a real login with Node's `crypto.scrypt` against an attacker with 300 candidate passwords, the right one being number 250. First, the cost of one guess:

```text
one scrypt run (median of 10): 64.8 ms of work for the server per guess, so 300 guesses are about 19.4 s of hashing
```

With **no limiter** the attacker wins, and the server does all the work:

```text
1. no limiter
   attacker: FOUND the password at attempt 250   (wrong guesses answered 249, refused with 429: 0)
   the server ran scrypt 250 times, 14029 ms in total
```

A **per-IP limiter** (5 attempts per minute) stops a single address after 5 guesses, and refuses the other 295 before any hashing happens:

```text
2. per-IP limiter: 5 attempts per minute
   attacker: did NOT find the password   (wrong guesses answered 5, refused with 429: 295)
   the server ran scrypt 5 times, 527 ms in total
```

The same limiter with `trust proxy` switched on while the server is reachable directly is defeated by a rotating fake `X-Forwarded-For`, exactly as in setup B above:

```text
3. the same per-IP limiter, but trust proxy is on and the server is reachable directly
   attacker: FOUND the password at attempt 250   (wrong guesses answered 249, refused with 429: 0)
   the server ran scrypt 250 times, 13955 ms in total
```

An attacker who really uses many addresses defeats a per-IP limiter by design. A **per-account limiter** counts the guesses against the username whatever the source. Here the attacker used 300 different source addresses:

```text
4. per-ACCOUNT limiter (5 attempts per minute for 'nadia'), attacker spread over 300 different source IPs
   attacker: did NOT find the password   (wrong guesses answered 5, refused with 429: 295)
   the server ran scrypt 5 times, 717 ms in total
   then the real nadia logs in from her own IP with the RIGHT password: 429
```

**Verified directly.** The per-account limiter stopped the distributed attacker, and it also locked out the real user, who was refused even with the correct password. That is the trade-off the OWASP Authentication Cheat Sheet describes: tie the failed-login counter to the account rather than the source IP to stop attempts spread across many addresses, balance the threshold, the observation window and the lockout duration, and remember that lockouts can be abused to deny service to other users. It also presents exponential lockout (a lockout that starts very short and doubles after each failed attempt) as an alternative to a fixed lockout, and describes CAPTCHA as a defense-in-depth control that can be shown only after a few failed attempts. Those two mitigations were not built or run here. And note what the limiter did not replace: strong hashing. It cut 250 hashes to 5, and it works only because the check runs **before** the hash.

### Several app instances: counters in Redis

An in-memory limiter counts what one process sees. With three instances behind a load balancer, one client's requests are split among three separate counters. A client sent 30 requests round-robin across three real servers, with a limit of 5 per minute:

```text
1. one client sends 30 requests, round-robin across 3 app instances. The limit is 5 per minute.
   in-memory limiter in each instance: 15 of 30 allowed
   one shared Redis limiter           :  5 of 30 allowed
```

**Verified directly.** Three instances allowed 15 (3 times the limit). One shared Redis counter allowed exactly 5. The express-rate-limit documentation says the same about its default in-memory store: with multiple servers or processes the results are inconsistent, so an external store is recommended.

Moving the counter to Redis is not enough, because **how** you update it matters. The version people write first reads the count, then increments it:

```js
    const current = Number((await this.client.get(k)) ?? 0); // 1. read ...
    if (current >= this.limit) return { allowed: false, limit: this.limit, remaining: 0, retryAfterMs: this.windowMs };
    await this.client.incr(k); // 2. ... then write: another client may have read the same value in between
```

Fifty requests arrive at the same moment over ten connections, with a limit of 10:

```text
2. 50 requests arrive at the same moment (spread over 10 connections). The limit is 10.
   GET, then INCR (not atomic)         : 50 of 50 allowed
   one Lua script: INCR + PEXPIRE      : 10 of 50 allowed
```

Every request read "0 so far" before any of them wrote, so all 50 were allowed. The fix is to make check-and-update one **atomic** step, here a Lua script that Redis runs without letting any other command in:

```lua
local count = redis.call("INCR", KEYS[1])
if count 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return { count, redis.call("PTTL", KEYS[1]) }
```

The Redis documentation for `INCR` describes a rate limiter pattern built on a counter with an expiry, and it names a second hazard: if a client performs the `INCR` but not the `EXPIRE`, the key is leaked. Its suggested fix is to turn the `INCR` with optional `EXPIRE` into a Lua script sent with `EVAL`, which is what the script above does with `PEXPIRE`. Here the process "dies" between the two:

```text
3. the process dies between INCR and PEXPIRE (limit 3 per 0.5 s window)
   first request: process died before PEXPIRE
   the key now: 1 request counted, PTTL -1 (-1 means no expiry)
   next 4 requests allowed: true, true, false, false; 0.7 s later (the window was 0.5 s): allowed false, PTTL still -1
   with the Lua script, right after the first request: PTTL > 0 (it will expire)
   0.7 s later: allowed true
```

**Verified directly.** The key that missed its expiry never reset: after the 0.5 second window had long passed the client was still refused, and `PTTL` was -1. With the script, the key always had an expiry and the client was allowed again. The same idea works for a token bucket. The script reads the time from Redis itself (`TIME`), so the clocks of the app instances do not matter:

```text
4. a token bucket in Redis (capacity 5, refills 1 token per second)
   8 requests back to back: yes yes yes yes yes no no no   (retry after about 998 ms)
   1.1 s later, one more: yes
   20 concurrent requests on a fresh bucket: 5 allowed
   the bucket cleans itself up: PTTL > 0 (the key expires on its own)
```

20 concurrent requests on a fresh bucket of 5 let exactly 5 through, and the bucket expires on its own (so unlike the in-memory limiters there is nothing to sweep). The Redis `GET`, `INCR`, `PEXPIRE` and Lua pieces were run against a single local server. What happens when Redis is down is a decision this topic did not build: either the limiter **fails open** (let everything through and lose protection) or **fails closed** (refuse everything and take your own API down). Redis Cluster and a Redis-backed store for the library (`rate-limit-redis`) were not run.

### The real library

You do not have to write any of this by hand. `express-rate-limit` is a middleware whose documentation describes it as "used to limit repeated requests to public APIs and/or endpoints such as password reset", with an in-memory default store (`MemoryStore`). `library-demo.js` shows what version 8.7.1 does. A limit of 3 per 60 seconds, 4 requests, and the headers on the first (200) and fourth (429) response for each `standardHeaders` setting:

```text
1. headers under each standardHeaders setting (limit 3 per 60 s; 4 requests; legacyHeaders off)
   draft-6
     request 1 (200): ratelimit-limit: 3 | ratelimit-policy: 3;w=60 | ratelimit-remaining: 2 | ratelimit-reset: 60
     request 4 (429): ratelimit-limit: 3 | ratelimit-policy: 3;w=60 | ratelimit-remaining: 0 | ratelimit-reset: 60 | retry-after: 60
     the 429 body: "Too many requests, please try again later."
   draft-7
     request 1 (200): ratelimit: limit=3, remaining=2, reset=60 | ratelimit-policy: 3;w=60
     request 4 (429): ratelimit: limit=3, remaining=0, reset=60 | ratelimit-policy: 3;w=60 | retry-after: 60
   draft-8
     request 1 (200): ratelimit: "3-in-1min"; r=2; t=60 | ratelimit-policy: "3-in-1min"; q=3; w=60; pk=:<hash>:
     request 4 (429): ratelimit: "3-in-1min"; r=0; t=60 | ratelimit-policy: "3-in-1min"; q=3; w=60; pk=:<hash>: | retry-after: 60
```

(The `pk` value, a hash that identifies the client, is masked in the demo so the output is identical on every run.) It also warns when your `trust proxy` setting does not fit the traffic, which is exactly the trap from the proxy section:

```text
2. what it warns about when trust proxy and X-Forwarded-For do not fit together
   trust proxy off, request carries X-Forwarded-For     -> ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
   trust proxy = true, request carries X-Forwarded-For  -> ERR_ERL_PERMISSIVE_TRUST_PROXY
```

**Verified directly.** The library sent `Retry-After` on the 429, offered three header formats (the older `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`, and two newer combined formats), warned about both `trust proxy` mistakes by name, and its `ipKeyGenerator` helper mapped IPv6 clients to a /56 subnet key. The middleware in this project is for learning, so you can see each case. For a real service prefer the library or a gateway in front of the app.

### What this topic does not cover

- **Concurrency limits and load shedding.** Stripe's write-up describes four kinds of limiter in production: a request rate limiter, a concurrent requests limiter (it caps how many requests are in progress at once, for example 20), and two load shedders (fleet usage and worker utilization). Only the first kind was built here.
- **Leaky bucket, GCRA and adaptive limits**, quotas (a monthly allowance), cost-weighted requests, and CAPTCHA.
- **Limits at the edge**: CDN, WAF and API gateway rate limiting, and distributed denial of service attacks, which a limiter inside one app cannot absorb.
- **Redis Cluster, replicas, a limiter that survives Redis failing**, and `rate-limit-redis` or any other external store for the library.
- **What a client should do on a 429**: backing off with growing, randomized delays. Only a client that obeys `Retry-After` once was run.
- **Real networks and real IPv6**: the "clients" were loopback addresses on one machine, and the proxy was a short simulation of one that appends `X-Forwarded-For`.

### Common mistakes

| Mistake | What happens |
| --- | --- |
| No limit on a login route | The attacker found the password at attempt 250, and the server hashed 250 times. Observed. |
| Only a fixed window counter | 20 requests got through in 0.2 s against a limit of 10. Observed. |
| Treating the sliding window counter as exact | Up to 15 requests in a 10-second window against a limit of 10. Observed. |
| `trust proxy = true` where clients can reach the app or the proxy appends | A forged `X-Forwarded-For` gave the attacker a new bucket every time (8 of 8). Observed. |
| `trust proxy` off behind a proxy | Everyone shared the proxy's address, and an innocent user was refused. Observed. |
| Only a per-account limit on login | The attacker was stopped, and so was the real user with the right password. Observed. |
| Only a per-IP limit on login | An attacker with many addresses gets a budget per address. Not run; the per-account result above is the reason for the second limiter. |
| An in-memory limiter on several instances | 15 of 30 allowed against a limit of 5. Observed. |
| Reading the Redis counter and then writing it | 50 of 50 concurrent requests allowed against a limit of 10. Observed. |
| `INCR` without an atomic `EXPIRE` | The key never expired (PTTL -1) and the client stayed blocked. Observed. |
| An in-memory limiter that never forgets keys | 10,000 clients left 10,000 entries until `sweep()`. Observed. |
| The limiter placed after parsing, authentication or database work | The cost is paid before the refusal. Only the correct order (5 of 8 reached the expensive middleware) was run; the wrong order is reasoned, not run. |
| Refusing without saying when to come back | Clients retry at once. `Retry-After` is optional in RFC 6585; the effect of omitting it was not run. |

### Practical tips

- Limit **before** the expensive work, and put stricter limits on sensitive routes (login, password reset, signup, anything that sends an email or text).
- Choose the key deliberately. Limit login attempts by account **and** by IP, and expect each one alone to fail in a different way.
- Set `trust proxy` to the real number of proxies in front of the app, never `true` on an app clients can reach, and test it with a forged `X-Forwarded-For`.
- Answer with `429` and a `Retry-After`. Send `X-RateLimit-*` or the draft `RateLimit` headers if clients should be able to pace themselves, and document which you chose.
- If the app runs on more than one instance, keep the counters in a shared store and make the read and the write one atomic step.
- Prefer a token bucket when short bursts are fine, a sliding window log when exactness matters and memory does not, and the sliding window counter when memory matters more than the last few percent.
- Give limiter state an expiry, or sweep it, so the limiter cannot be a memory leak.
- Decide what happens when the limiter's store is down (fail open or fail closed), write it down, and test it.
- Treat the limiter as one layer: it does not replace password hashing, validation, or a cap on page size.

## Resources

- OWASP API Security Top 10 2023, API4:2023 Unrestricted Resource Consumption: <https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/>
- RFC 6585, Additional HTTP Status Codes (429 Too Many Requests): <https://www.rfc-editor.org/rfc/rfc6585>
- MDN, 429 Too Many Requests: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429>
- MDN, Retry-After header: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After>
- IETF Internet-Draft, RateLimit header fields for HTTP: <https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/>
- Express, Express behind proxies (the `trust proxy` setting): <https://expressjs.com/en/guide/behind-proxies.html>
- OWASP, Authentication Cheat Sheet (login throttling and account lockout): <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- Redis, INCR command (the rate limiter pattern): <https://redis.io/docs/latest/commands/incr/>
- express-rate-limit documentation: <https://express-rate-limit.mintlify.app/overview>
- Stripe Engineering, Scaling your API with rate limiters: <https://stripe.com/blog/rate-limiters>
- Cloudflare, How we built rate limiting capable of scaling to millions of domains: <https://blog.cloudflare.com/counting-things-a-lot-of-different-things/>

## Practice

1. Add a **leaky bucket** limiter to `limiters.js` that acts as a queue (requests drain at a fixed rate, and a full queue refuses). Add it to `algorithms-demo.js`, predict its numbers for the boundary burst and the 120-request run before you run them, and explain how it differs from the token bucket.
2. Change `rate-limit-middleware.js` to send the draft headers `RateLimit-Policy` and `RateLimit` instead of `X-RateLimit-*`. Use the output of `library-demo.js` for draft-7 as the format to match, and write a check that compares your headers with the library's for the same limit.
3. In `proxy-ip-demo.js`, add setup F where the proxy **overwrites** `X-Forwarded-For` with the address it saw instead of appending to it. Predict the attacker's result with `trust proxy = true`, run it, and explain what Express's documentation means when it says the last trusted proxy must remove or overwrite the header.
4. In `login-demo.js`, add a scenario with a limiter keyed on the account **and** the source IP (for example 5 attempts per minute for each pair), plus a looser account-only limit. Run the distributed attacker and the real user, and write down what the attacker can still do and what the real user can now do.
5. In `distributed-demo.js`, stop the Redis server in the middle of a run (or point the limiter at a port where nothing listens). Add a `failOpen` option to the middleware, test both settings, and write down which you would choose for a login route and which for a public read route, and why.

## Code Example

- [limiters.js](./03-rate-limiting/limiters.js)
- [rate-limit-middleware.js](./03-rate-limiting/rate-limit-middleware.js)
- [timing.js](./03-rate-limiting/timing.js)
- [algorithms-demo.js](./03-rate-limiting/algorithms-demo.js)
- [http-demo.js](./03-rate-limiting/http-demo.js)
- [proxy-ip-demo.js](./03-rate-limiting/proxy-ip-demo.js)
- [login-demo.js](./03-rate-limiting/login-demo.js)
- [redis-local.js](./03-rate-limiting/redis-local.js)
- [redis-limiters.js](./03-rate-limiting/redis-limiters.js)
- [distributed-demo.js](./03-rate-limiting/distributed-demo.js)
- [library-demo.js](./03-rate-limiting/library-demo.js)

To run it yourself, run `npm install` in the project folder. You need a Node.js version that has `crypto.scrypt` and a global `fetch` (this was run on 22.22.0, and I did not test other versions). Then:

```text
npm run algorithms-demo
npm run http-demo
npm run proxy-ip-demo
npm run login-demo
npm run distributed-demo
npm run library-demo
```

`algorithms-demo` needs nothing else and finishes in a moment. `http-demo` takes about 3 seconds (it waits out a real `Retry-After`). `login-demo` takes about half a minute because it really runs scrypt about 520 times. The proxy demo uses the loopback addresses `127.0.0.2` and `127.0.0.3` and the login demo uses a range of `127.0.x.y` addresses as separate clients. That works on Linux, and I did not test it on macOS or Windows, where extra loopback addresses may need to be set up first. `distributed-demo` needs the `redis-server` program on your `PATH` (7.0.15 was used) and starts and stops its own copy on a free local port, or you can set `REDIS_URL` to a server you can use (it only writes keys whose names start with `demo` or `rl:`, and the demo keys last up to a minute, so I would not re-run it against the same server inside a minute; that is reasoned, not run). The Express app and the limiters in this project are teaching code: they show each case on purpose, and `NaiveRedisLimiter` is wrong on purpose, so do not copy it into a real app.
