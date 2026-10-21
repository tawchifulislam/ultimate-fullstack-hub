# Caching

**Topic 88 of 89** (Section: API / System Design Basics, 2 of 3)

## Notes

### Project structure

```text
origin.js              -> the slow thing behind the cache: a simulated 100 ms product lookup, and a real SQLite GROUP BY
ttl-cache.js           -> an in-process cache: TTL expiry, LRU eviction, and single-flight loading
timing.js              -> small timing helpers and a deterministic random generator
cache-aside-demo.js    -> cache-aside, TTL expiry, stale data, invalidating on write, a 200-request workload
stampede-demo.js       -> 50 requests miss the same key at once, with and without single-flight
lru-demo.js            -> LRU eviction order, an unbounded cache against a bounded one, hit ratio against capacity
http-cache-app.js      -> an Express 5 server whose routes send different Cache-Control, ETag and Last-Modified headers
http-cache-check.js    -> the ETag and 304 conversation, sent by hand with node:http
browser-cache-lab.js   -> the same routes called from a real Chromium, with the server's own log as evidence
response-cache.js      -> Express middleware that caches whole JSON responses by a key you choose
leak-demo.js           -> a per-user response cached under a key without the user: what leaks, and the fix
redis-cache.js         -> cache-aside on Redis, and a SET NX lock so only one instance refreshes an entry
redis-demo.js          -> real Redis: expiry, a cache shared by two instances, the lock, maxmemory and eviction
package.json
```

A cache keeps a copy of an answer close to whoever asks, so the next ask is cheap. It trades **freshness for speed**: every cache can hand out an answer that is out of date, and every cache design is a decision about how stale is acceptable and who is allowed to see what. This topic builds on Topic 87, because pagination is what made list endpoints cheap enough to serve and the page and cursor responses are natural things to cache, on Topic 81, because a response that depends on who is asking must never be served to somebody else, and on Topic 77, because the safe, repeatable `GET` is the request that HTTP caching is built around.

Every result below was run on Node 22.22.0 with Express 5.3.0, the `redis` npm client 5.12.1 against a real Redis server 7.0.15 (started by the script on `127.0.0.1`), and Chromium 141.0.7390.37 driven by playwright-core 1.64.1. Browser behavior is specific to that Chromium version. Other browsers were not tested.

Two kinds of slowness are used, and they are labeled each time. `getProduct()` in `origin.js` is a **simulated** delay (a fixed 100 ms, or 20 ms where it says so) that stands in for a database on another machine. `topCustomers()` is **real**: a `GROUP BY` over 200,000 rows in SQLite. All timings come from one machine and move from run to run, so compare numbers inside one table with each other and not with the numbers on your machine.

### Where caches live

An answer can be cached at several layers, and each has a different owner and a different way to go stale:

| Layer | Who shares it | Who can invalidate it | Run here? |
| --- | --- | --- | --- |
| The browser's HTTP cache | One user on one browser (a private cache) | The server only through headers, or the user | Yes, in real Chromium |
| A CDN or proxy (a shared cache) | Many users | Its own purge tools, and headers | No |
| In the app process (a `Map`) | Everyone on that one process | Your code, on that process only | Yes |
| A shared store such as Redis | Every app instance | Your code, for everyone at once | Yes |
| The database's own caches | Everyone | The database | No |

MDN draws the same line between **private** caches (tied to one client, so safe for personalized responses) and **shared** caches (proxies and CDNs, which can serve one stored response to many users, so a personalized response in one must be marked `Cache-Control: private`). That shared-cache behavior was not run here: there was no CDN or proxy in the lab. What the rest of this topic shows is what happens when the same mistake is made inside your own server (see the section on the per-user leak).

### Cache-aside (lazy loading)

The most common pattern. The application asks the cache first. On a miss it asks the origin, then stores the answer for next time. The core of `getOrLoad` in `ttl-cache.js`:

```js
const cached = this.get(key);
if (cached !== undefined) return cached;
const value = await loader();
if (value !== undefined) this.set(key, value, ttlMs); // a failed loader throws before this line: errors are never cached
```

Five reads of one product, with a simulated 100 ms origin:

```text
1. cache-aside: the first read pays for the origin, the rest do not (origin delay 100 ms, simulated)
   read 1:  100.7 ms   origin ran: yes   price 17
   read 2:    0.0 ms   origin ran: no    price 17
   read 3:    0.0 ms   origin ran: no    price 17
   read 4:    0.0 ms   origin ran: no    price 17
   read 5:    0.0 ms   origin ran: no    price 17
   5 reads, origin called 1 time(s). cache: {"hits":4,"misses":1}, hit ratio 80%
```

Every entry has a **TTL** (time to live), after which it is treated as missing and the next read loads it again. With a 300 ms TTL and real waiting:

```text
2. TTL: an entry expires (TTL 300 ms, real waiting)
   read at 0 ms              100.5 ms   origin ran: yes
   read right after            0.0 ms   origin ran: no 
   read after 350 ms         100.5 ms   origin ran: yes
   expirations counted by the cache: 1
```

Over a whole workload of 200 requests spread evenly across 20 products (simulated 20 ms origin), the cache cut the origin's work from 200 calls to 20, one per product:

```text
4. a workload: 200 requests, spread evenly over 20 products (origin delay 20 ms, simulated)
   no cache  : origin called 200 times, 4066.0 ms in total
   cache     : origin called  20 times,  407.5 ms in total, hit ratio 90.0%
```

**Verified directly.** The first read of a key paid the origin cost and the next four did not, and the origin was called once per key, not once per request. Amazon's ElastiCache documentation describes the same strategy under the name **lazy loading** and lists its two costs, which the rest of this topic shows: a miss costs three trips (read the cache, query the origin, write the cache), and the cached data can be stale. That page is written for Memcached, and the strategies apply to any cache.

### Staleness: TTL, and invalidating on write

The price of a cache is that it can disagree with the origin. In `cache-aside-demo.js` a product's price changes from 17 to 999 after it was cached, and three policies are compared:

```text
3. the price of caching: stale data. The product's price changes from 17 to 999.
   A. TTL 60 s, no invalidation  : before 17, after the update the cache says 17   (origin says 999)
   B. TTL 300 ms                 : right after the update 17, 350 ms later 999
   C. TTL 60 s + delete on write : right after the update 999
```

A. A long TTL and no invalidation: the cache kept saying 17 for as long as the TTL lasts. B. A short TTL: still stale right after the update, but only for at most the TTL. C. **Delete the cached entry whenever the data is written**: fresh immediately, but every code path that writes the data must remember to do it.

**Verified directly.** In practice the two are combined: delete on write for freshness, and a TTL as the safety net for the writes that forgot (or the cache that could not be reached). The ElastiCache page recommends a similar mix: lazy loading and **write-through** together, with a TTL. Write-through (writing the new value into the cache at the same time as the database) was not built or run here.

### Cache stampede

A **stampede** (a thundering herd) happens when many requests ask for the same key at the moment it is missing, because it is cold or has just expired. Each sees a miss and each goes to the origin, which is exactly the load the cache was meant to prevent. 50 requests arrive together:

```text
1. 50 requests arrive together for one product (origin delay 100 ms, simulated)
   (a real database slows down under that load; this simulated one does not, so the call COUNT is the evidence)
   cold key, no single-flight     origin calls: 50   callers that joined a load:  0   all 50 answered in   101.7 ms
   cold key, single-flight        origin calls:  1   callers that joined a load: 49   all 50 answered in   100.5 ms
   expired key, no single-flight  origin calls: 50   callers that joined a load:  0   all 50 answered in   100.8 ms
   expired key, single-flight     origin calls:  1   callers that joined a load: 49   all 50 answered in   100.4 ms
```

The fix, **single-flight**, keeps a map of loads that are in progress. The first caller starts the load and every other caller for that key waits for the same promise:

```js
if (singleFlight && this.inflight.has(key)) {
  this.stats.coalesced++; // join the load already running instead of starting another
  return this.inflight.get(key);
}
```

The simulated origin does not slow down under load, so the time did not change and the **call count** is the evidence. Against real work the time is evidence too. The same 50 callers against a real SQLite query:

```text
2. the same stampede against REAL work: a GROUP BY over 200,000 rows in SQLite (50 callers)
   one query on its own:    72.7 ms   top customer {"customer":85,"orders":227,"total":86435}
   no single-flight: query ran 50 times, 50 callers answered after  3510.0 ms
   single-flight   : query ran  1 times, 50 callers answered after    71.0 ms
```

When the origin fails, the error must be shared and must not be cached, or the failure outlives the outage:

```text
3. when the origin fails: the error is shared, and it is not cached
   10 callers during the outage: 10 got the error "origin is down", loader ran 1 time(s), entries cached: 0
   the next call retried (loader has run 2 times) and got {"id":7,"name":"Product 7"}, entries cached: 1
```

**Verified directly.** 50 callers caused 50 origin calls without single-flight and 1 with it, for a cold key and for an expired one. With real CPU work that was 3510.0 ms against 71.0 ms. Single-flight lives inside one process. With several app instances each still has its own in-flight map, so the Redis lock below is the next step.

### Bounded caches and LRU eviction

A cache with no size limit is a memory leak with a friendlier name. When the cache is full, something has to go, and the usual choice is **LRU** (least recently used). A JavaScript `Map` remembers insertion order, so re-inserting a key on every read keeps the least recently used key first. A trace with capacity 3:

```text
1. LRU eviction, capacity 3 (keys listed from least to most recently used)
   set a, b, c                    keys: a, b, c  evictions: 0
   read a                         keys: b, c, a  evictions: 0
   set d  (b was least recent)    keys: c, a, d  evictions: 1
   read c, set e                  keys: d, c, e  evictions: 2
   get("b") -> undefined   (evicted, so it is a miss and the origin would be asked again)
```

When 100,000 different keys arrive, the unbounded cache keeps all of them:

```text
2. 100,000 different keys arrive, one request each
   no limit        : 100000 entries held, 0 evicted
   maxEntries 500  :    500 entries held, 99500 evicted
```

How big should it be? That depends on the **shape of the traffic**, not only on the capacity. The demo sends the same 20,000 requests over 1,000 possible keys, once with every key equally likely and once with a few hot keys:

```text
3. hit ratio against capacity: 1,000 possible keys, 20,000 requests, LRU
   traffic                           cap   10  cap   50  cap  100  cap  250  cap  500  cap 1000
   even (every key equally likely)    0.9%      4.6%      9.6%     24.1%     49.2%     95.0% 
   skewed (a few keys are hot)        9.9%     23.2%     32.4%     51.2%     71.3%     95.0%
```

**Verified directly.** With even traffic the hit ratio was about the capacity divided by the number of keys. With skewed traffic a cache holding 5% of the keys (capacity 50) still gave 23.2%, and holding half of them gave 71.3%. Caches work because real traffic is skewed. Even a cache big enough to hold every key topped out at 95.0%, which is (20,000 minus 1,000) divided by 20,000: each of the 1,000 keys had to miss once, the first time it was asked for.

### HTTP caching

The same idea, done by the browser and by shared caches, controlled with response headers. `http-cache-app.js` has one route for each interesting case, and `browser-cache-lab.js` calls them from a real Chromium page three times in a row. The evidence is the **server's own log** of the requests that reached it, not a guess about what the browser did.

```text
1. the page calls fetch() three times, one after another. What reached the server?
   route       the page saw       requests that reached the server
   /max-age    200, 200, 200      1 of 3: 200
   /no-cache   200, 200, 200      3 of 3: 200, 304 (conditional), 304 (conditional)
   /no-store   200, 200, 200      3 of 3: 200, 200, 200
   /immutable  200, 200, 200      1 of 3: 200
   /heuristic  200, 200, 200      1 of 3: 200
```

The page saw a 200 every time. A `304` is hidden from page code: the browser turns it into the cached response. The server's log is the only place the difference shows. What each route sends:

| Route | Header | What Chromium did |
| --- | --- | --- |
| `/max-age` | `Cache-Control: public, max-age=60` | Asked the server once, then served the response from its cache for the other two |
| `/no-cache` | `Cache-Control: no-cache` | Stored it, but asked the server every time: a `200`, then two conditional requests answered `304` |
| `/no-store` | `Cache-Control: no-store` | Never reused it: 3 requests, all `200` |
| `/immutable` | `Cache-Control: public, max-age=31536000, immutable` | Asked once |
| `/heuristic` | no `Cache-Control`, only `Last-Modified` | Asked once, because the browser decided by itself that it was fresh |

MDN and RFC 9111 define these directives. `max-age=N` keeps a response fresh for N seconds. `no-cache` **allows storing** but requires revalidating with the server before every reuse (it does not mean "do not cache"). `no-store` forbids storing it at all. `private` limits storage to one user's cache, `public` allows shared caches, and `immutable` tells a cache the response will not change while it is fresh. **Heuristic caching** is the fallback when there is no `Cache-Control`: a cache may guess a freshness lifetime from `Last-Modified` (MDN gives about 10% of the time since the last change). The lab shows Chromium reusing a response that had no `Cache-Control` at all, which is why every response should say what it wants.

**Verified directly.** The page cannot tell a cached response from a revalidated one, and `no-cache` and `no-store` behaved differently: `no-cache` cost 3 requests but only 1 full download, `no-store` cost 3 full downloads.

#### ETag, If-None-Match and 304

A **validator** lets a client ask "has this changed?" instead of downloading it again. The server sends an `ETag` (an identifier for this version of the response). The client sends it back in `If-None-Match`. If it still matches, the server answers `304 Not Modified` with no body. Express adds a weak ETag (`W/"..."`) to every `res.json()` body by itself. `http-cache-check.js` sends the requests by hand:

```text
2. the conditional request: ETag, If-None-Match, 304
   GET /no-cache                                  -> 200, body 35 bytes, ETag W/"23-teWkIhWpzqawjZm7ZNwpPqX8O0s"
   GET /no-cache, If-None-Match: that ETag        -> 304, body 0 bytes
   the handler ran 2 times for those two requests (a 304 saves the download, not the work)
   GET /no-cache, If-None-Match: a different tag  -> 200, body 35 bytes
   after POST /bump, the old tag is sent again    -> 200, body {"resource":"no-cache","version":2}, new ETag W/"23-2ypZzhNZczpI4f02SOjL7zjaYpY"
```

`Last-Modified` and `If-Modified-Since` are the date-based version of the same conversation:

```text
3. last-modified works the same way: If-Modified-Since
   GET /heuristic, If-Modified-Since: its own Last-Modified -> 304, body 0 bytes
```

A `304` saves **bandwidth**, not **work**: the handler ran for both requests. To save work too, check the validator **before** doing the work. `/report` builds its ETag from a version number, so it can answer "unchanged" without running its expensive query (`req.fresh` is Express's check of the request headers against the ETag and `Last-Modified` that were just set):

```text
4. an expensive route that checks the validator BEFORE doing the work (/report: a real SQLite query)
   GET /report                      -> 200,   73.3 ms, body 253 bytes, ETag W/"report-v2", queries run: 1
   GET /report, If-None-Match       -> 304,    1.5 ms, body   0 bytes, queries run: 1
   after POST /bump, same tag sent  -> 200,   76.6 ms, body 253 bytes, ETag W/"report-v3", queries run: 2
```

**Verified directly.** The matching ETag got a `304` with an empty body, and the version bump changed the ETag so the old tag got a full `200`. The cheap-validator route answered in 1.5 ms without running the query, against 73.3 ms for the real one.

#### What the browser does with fetch() cache modes

A page can override the cache per request. `/max-age` was already in the cache and still fresh, and the lab tried each `fetch()` mode:

```text
2. /max-age is in the cache and still fresh. What does each fetch() cache mode do?
   cache mode  request reached the server?   what the browser sent
   default     no                           -
   force-cache no                           -
   no-store    yes                          200, request Cache-Control: (none)
   no-cache    yes                          304 (conditional), request Cache-Control: max-age=0
   reload      yes                          200, request Cache-Control: no-cache
```

`default` and `force-cache` did not reach the server. `no-cache` revalidated (a conditional request, answered `304`). `reload` and `no-store` fetched again in full. Note that `reload` sends `Cache-Control: no-cache` on the request, and that matters in the next section.

#### Two gotchas, both observed

**A request-side `no-cache` turns off the 304.** Express documents that when a client sends `Cache-Control: no-cache` on the request (an end-to-end reload), `req.fresh` returns `false` so the full response is sent. And Node's built-in `fetch` added exactly that header to a request that carried `If-None-Match` (observed on Node 22.22.0):

```text
5. a gotcha: Node's fetch adds Cache-Control: no-cache to a request that carries If-None-Match
   node:http, If-None-Match: W/"22-0VHP24dinEiW7Pi7kkV97g67zQc"  -> 304
   fetch,     If-None-Match: W/"22-0VHP24dinEiW7Pi7kkV97g67zQc"  -> 200   (the server saw Cache-Control: no-cache on that request)
   node:http, If-None-Match + Cache-Control: no-cache    -> 200
   node:http, If-None-Match + Cache-Control: max-age=0   -> 304
   So a request-side no-cache makes Express send the full 200 (req.fresh is false), and max-age=0 does not.
```

If you test a conditional request from a Node script and never see a `304`, check which client sent it. In the browser lab above, the `fetch()` mode `no-cache` sent `max-age=0` and got a `304`, while the `reload` mode sent `no-cache` and got a full `200`. A reload from the browser's own menu or keyboard shortcut was not tested.

**`max-age` cannot be taken back.** While a response is fresh, the browser does not ask the server, so a change on the server is invisible. The lab changed the data on the server (`POST /bump`) and fetched again:

```text
3. the price of max-age: the data changes on the server (POST /bump), and the page fetches again
   /max-age   the page had version 1, the server changed to version 2, the page now sees version 1   (server requests: 200)
   /no-cache  the page had version 2, the server changed to version 3, the page now sees version 3   (server requests: 200, 200 (conditional))
```

**Verified directly.** The `max-age` page kept seeing version 1 after the server moved to version 2, and the `no-cache` page saw the new version immediately. The web.dev article draws the practical conclusion: long `max-age` for **versioned (fingerprinted) URLs** whose content never changes under the same name, and a revalidation approach such as `no-cache` plus an ETag for HTML and any URL that cannot be fingerprinted. The behavior of `immutable` on a page reload, `Vary`, and `stale-while-revalidate` were not run.

### Server-side response caching, and the per-user leak

`response-cache.js` is Express middleware that caches whole JSON responses, so a repeated request is answered without running the handler. It is also where the most dangerous caching bug lives. The `key` function decides which requests count as "the same", and everything the response depends on must be in it. `/me` returns the current user's own data. The "login" is a stand-in `X-User` header (a real app would use a session cookie or a token, Topics 81 and 86), and the caching bug is the same either way:

```text
1. cache keyed by URL only, placed before the login check
   alice asks for /me  -> 200  X-Cache: MISS {"user":"alice","email":"alice@example.com","balance":4200}
   bob asks for /me    -> 200  X-Cache: HIT  {"user":"alice","email":"alice@example.com","balance":4200}
   nobody (no login)   -> 200  X-Cache: HIT  {"user":"alice","email":"alice@example.com","balance":4200}
   alice asks again    -> 200  X-Cache: HIT  {"user":"alice","email":"alice@example.com","balance":4200}
   handler ran 1 time(s)
```

Two mistakes stacked. The key was only the URL, so every user shared one entry. And the cache sat **before** the login check, so a hit never reached it and a request with no login at all was handed Alice's email and balance. The fix is to log in first and then put the user into the key:

```text
2. login first, the user is part of the cache key
   alice asks for /me  -> 200  X-Cache: MISS {"user":"alice","email":"alice@example.com","balance":4200}
   bob asks for /me    -> 200  X-Cache: MISS {"user":"bob","email":"bob@example.com","balance":17}
   nobody (no login)   -> 401  X-Cache: -    {"error":"log in first"}
   alice asks again    -> 200  X-Cache: HIT  {"user":"alice","email":"alice@example.com","balance":4200}
   handler ran 2 time(s)
```

**Verified directly.** The same mistake in a CDN or proxy is what `Cache-Control: private` is for (MDN: it limits storage to a single user's cache such as a browser). That header, and `public`, were described by MDN and not run here, since the lab had no shared cache. The rule for your own server is the same: authenticate first, key on **everything** the response depends on (the path, the query string, the user, and anything else that changes the body, such as a language), or do not cache it at all.

### A shared cache with Redis

An in-process cache is fast, but each app instance has its own copy. **Redis** is a separate server that every instance talks to. `redis-demo.js` starts a real Redis 7.0.15 (no persistence, bound to `127.0.0.1`) and uses it for everything. First, expiry is real, and a key written **without** an expiry never expires:

```text
1. expiry is real (SET ... EX 2)
   right after SET        : TTL 2 s, value {"id":7,"price":17}
   2.3 s later            : TTL -2 (-2 means the key is gone), value undefined
   SET with no EX         : TTL -1 (-1 means it never expires)
   1000 reads of one key  : in-process cache 0.351 ms in total, Redis on localhost 68.446 ms in total (0.068 ms each; a real network adds more)
```

The Redis `SET` documentation lists the options used here: `EX` sets an expiry in seconds, and `NX` sets the key only if it does not already exist (`SET` returns null when the condition is not met). A read from Redis was about 200 times slower than a read from a `Map` in this process (68.446 ms against 0.351 ms for 1,000 reads), and still tiny next to a 100 ms origin. The network hop on a real deployment was not measured.

Second, the multi-instance problem. Instances A and B each cache product 7. A handles the price change and invalidates **its own** cache:

```text
2. two app instances, one product: in-process caches against one shared Redis
   in-process caches : origin loads 2, after the update A reads 999, B reads 17   (origin says 999)
   shared Redis      : origin loads 1, after the update A reads 999, B reads 999   (origin says 999)
```

With per-process caches, B kept serving the old price, and A cannot tell B to drop it. With one shared Redis key, the delete reaches every instance, and the origin was loaded once instead of twice. Third, the stampede again, now across ten instances that each have their own connection. A single-flight map cannot see across processes, so the loader is guarded by a `SET key value NX EX` lock. Only the instance that wins it calls the origin. The others poll the cache until the winner fills it:

```text
3. ten instances miss the same key at the same moment (origin delay 100 ms, simulated)
   plain cache-aside    : origin calls 10, all 10 instances got the same answer
   with a SET NX lock   : origin calls  1, all 10 instances got the same answer
```

That lock is enough for refreshing one cache entry on a single Redis node. It is not a general-purpose distributed lock (Redlock and fencing were not covered). Fourth, memory is finite. `maxmemory` caps what Redis may use and the `maxmemory-policy` decides what happens at the cap. The demo gives Redis about 2 MB of room and writes 20,000 values of about 500 bytes each:

```text
4. memory is finite: maxmemory and an eviction policy
   allkeys-lru : 20000 writes of ~500 bytes into ~2 MB of room -> all accepted, keys held 3299, evicted_keys 16742
                 of the first 1000 keys written, 2 are still there; of the last 1000 keys written, 771 are
   noeviction  : 3341 writes accepted, then the write failed with: OOM command not allowed when used memory > 'maxmemory'.
```

**Verified directly.** With `allkeys-lru` every write was accepted and Redis threw away keys that had not been used recently: almost none of the oldest 1,000 keys were left, and most (but not all) of the newest 1,000 were. Over six runs of this section, between 0 and 2 of the first 1,000 survived and between 720 and 771 of the last 1,000. Redis approximates LRU by sampling a few keys, so do not rely on any particular recent key still being there. With `noeviction` the writes started failing with an out-of-memory error once the limit was reached. The Redis eviction documentation describes the same two behaviors (`allkeys-lru` evicts the least recently used keys from the whole keyspace, using an approximation that samples a few keys, and `noeviction` rejects commands that would add data while reads keep working). The two counters (3299 held and 16742 evicted) do not add up to exactly 20,000: Redis evicts as commands arrive, I read them a moment apart (a total of 20,041 in this run), and I did not chase the difference. The exact numbers are not the point. The documentation lists more policies than the two that were run (the `volatile-*` policies, `allkeys-random`, `allkeys-lfu`), and the "latest" documentation may describe features that the Redis 7.0.15 used here does not have.

### What to cache, and what not to

- **Cache** answers that are expensive to produce, requested often, and fine to be a little out of date: product pages, public lists, computed reports, the results of calls to another service.
- **Be careful with** anything that depends on the user (key by user, or skip), anything that changes on every write (a balance, stock count, a counter), and anything where a stale answer is a correctness bug rather than a slow page.
- **Decide the staleness first.** How long can this answer be wrong? That number is the TTL, and "forever" is almost never the answer.
- **Pagination and caching (Topic 87)**: a cursor page is a fixed slice of a list as of one position, while an offset page changes whenever rows are inserted above it. That makes cursor pages the safer thing to cache and offset pages the staler. That reasoning follows from the Topic 87 results and was not run here.

### What this topic does not cover

- **CDNs and proxy caches**, `Cache-Control: s-maxage`, `Vary`, `stale-while-revalidate` and `stale-if-error`. Only a private browser cache was run.
- **Write-through and write-behind** caching, cache warming, and caching a "not found" answer on purpose (the in-process cache can store `null`, but no demo uses it).
- **Redis Cluster, persistence, Pub/Sub invalidation, client-side caching, and Redlock.** Only a single local server was run.
- **Browsers other than Chromium**, service worker caches and the Cache API.
- **Libraries and frameworks**: `lru-cache`, `node-cache`, Memcached, and the data and page caches built into frameworks such as Next.js.
- **Real network latency and real concurrent users**: everything ran on `localhost` in a few processes.

### Common mistakes

| Mistake | What happens |
| --- | --- |
| A response that depends on the user, cached under a key without the user | Bob was handed Alice's email and balance. Observed. |
| The response cache placed before the login check | A request with no login at all was answered with Alice's data. Observed. |
| A key written to Redis without an expiry (`SET` with no `EX`) | `TTL` was -1: it never expires. Observed. |
| An in-process cache with no size limit | 100,000 keys, 100,000 entries held. Observed. |
| No protection against a stampede | 50 simultaneous misses caused 50 origin calls, and 3510.0 ms of real work instead of 71.0 ms. Observed. |
| Invalidating only your own process's cache | The other instance kept serving the old price (17 against 999). Observed. |
| A long `max-age` on data that changes | The page kept seeing version 1 after the server moved to version 2. Observed. |
| Reading `no-cache` as "do not cache" | Chromium stored it and revalidated every time (200, 304, 304). `no-store` is the one that forbids storing. Observed. |
| Expecting a `304` to save server work | The handler ran for both requests. Only a validator check before the work saves it (1.5 ms against 73.3 ms). Observed. |
| Testing 304s with Node's `fetch` | It adds `Cache-Control: no-cache` to a request with `If-None-Match`, so Express sends a full 200. Observed. |
| No `Cache-Control` at all | Chromium decided by itself that the response was fresh. Observed. |
| Redis at its memory limit with `noeviction` | Writes failed with an out-of-memory error. Observed. |
| Sizing a cache by the share of keys it holds | Skewed traffic gave 23.2% at 5% of the keys, even traffic gave 4.6%. Observed. |
| Caching a failed load | The failure outlives the outage. This cache never stores it (observed); caching one by mistake was not run. |

### Practical tips

- Give every cache entry a TTL, and choose it from how stale the answer is allowed to be. In Redis always pass `EX`.
- Invalidate on write for freshness, and keep a TTL as the safety net for the writes that forget.
- Put **everything the response depends on** into the cache key, authenticate before the cache, and do not cache per-user responses unless the user is in the key.
- Bound every in-process cache (`maxEntries`) and decide the eviction policy of a shared one (`maxmemory` and `maxmemory-policy`).
- Protect hot keys from a stampede with single-flight in a process and a `SET NX EX` lock across instances. Never cache a failure.
- For HTTP: fingerprint static assets and give them a long `max-age` with `immutable`. Use `no-cache` plus an ETag for responses that must be checked each time, and `no-store` for data that must never be stored.
- Check the validator **before** doing expensive work, so a `304` saves the work and not only the download.
- Always send an explicit `Cache-Control`. A response without one is cached by guesswork.
- Measure the hit ratio. A cache with a poor hit ratio is extra complexity with no benefit.

## Resources

- MDN, HTTP caching: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching>
- MDN, Cache-Control header: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control>
- MDN, ETag header: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag>
- RFC 9111, HTTP Caching: <https://www.rfc-editor.org/rfc/rfc9111>
- web.dev, Prevent unnecessary network requests with the HTTP Cache: <https://web.dev/articles/http-cache>
- Express 5.x, Request object (`req.fresh`): <https://expressjs.com/en/5x/api/request/>
- Redis, SET command: <https://redis.io/docs/latest/commands/set/>
- Redis, Key eviction: <https://redis.io/docs/latest/develop/reference/eviction/>
- Amazon ElastiCache, Caching strategies (lazy loading, write-through, TTL; written for Memcached): <https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html>

## Practice

1. In `cache-aside-demo.js` section 3, replace "delete on write" with **write-through**: after the update, set the new value in the cache instead of deleting it. Predict what happens if two updates to the same product run at the same time and their cache writes land in the opposite order, then write a script that tries to produce it.
2. Add `stale-while-revalidate` to `TTLCache`: when an entry has expired but is younger than a grace period, return the stale value immediately and refresh it in the background. Predict how many origin calls and how much latency 50 simultaneous requests see (use `stampede-demo.js` as the harness), then measure it.
3. In `browser-cache-lab.js`, open a second `browser.newContext()` and fetch `/max-age` there after the first context has cached it. Predict how many requests reach the server before you run it, then explain the result using the words private cache and profile.
4. In `leak-demo.js`, move the `responseCache` middleware in the fixed variant to before `authenticate` but keep the key `${req.user.user}|${req.originalUrl}`. Run it and explain what happens to the anonymous request. Then fix it in a way that still caches.
5. In `redis-demo.js` section 4, set the policy to `volatile-lru` and write the keys **without** `EX`. Predict the result from the Redis eviction documentation, run it, and explain why a cache whose keys never expire cannot rely on `volatile-lru`.

## Code Example

- [origin.js](./02-caching/origin.js)
- [ttl-cache.js](./02-caching/ttl-cache.js)
- [timing.js](./02-caching/timing.js)
- [cache-aside-demo.js](./02-caching/cache-aside-demo.js)
- [stampede-demo.js](./02-caching/stampede-demo.js)
- [lru-demo.js](./02-caching/lru-demo.js)
- [http-cache-app.js](./02-caching/http-cache-app.js)
- [http-cache-check.js](./02-caching/http-cache-check.js)
- [browser-cache-lab.js](./02-caching/browser-cache-lab.js)
- [response-cache.js](./02-caching/response-cache.js)
- [leak-demo.js](./02-caching/leak-demo.js)
- [redis-cache.js](./02-caching/redis-cache.js)
- [redis-demo.js](./02-caching/redis-demo.js)

To run it yourself, run `npm install` in the project folder. You need a Node.js version that includes the built-in `node:sqlite` module (this was run on 22.22.0, and I did not test other versions). Then:

```text
npm run cache-aside-demo
npm run stampede-demo
npm run lru-demo
npm run http-cache-check
npm run leak-demo
```

Those five need nothing else. `npm run stampede-demo` and `npm run http-cache-check` build a 200,000-row SQLite table and take a few seconds. The last two need something extra. `npm run redis-demo` needs the `redis-server` program on your `PATH` (7.0.15 was used) and starts and stops its own copy on a free local port. Or set `REDIS_URL` to a server of your own, in which case it only touches keys that start with `topic88:` and skips the memory-limit section (which needs `FLUSHALL` and `CONFIG SET`). `npm run browser-cache-lab` needs a Chromium: set `CHROMIUM_PATH` to a Chrome or Chromium you already have (this is how it was run), or install one with `npx playwright-core install chromium`, which was not run here.

To look at the headers yourself, run `npm start` (the server listens on port 4980, or pass another port to `node --disable-warning=ExperimentalWarning http-cache-app.js`) and call `curl -i http://localhost:4980/max-age`, then `curl -i -H 'If-None-Match: <the ETag you got>' http://localhost:4980/no-cache`. The data lives in memory and is rebuilt every time the server starts. Do not copy the demo response cache into a real app without putting the user, and every other thing that changes the response, into its key.
