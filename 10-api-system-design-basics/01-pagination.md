# Pagination

**Topic 87 of 89** (Section: API / System Design Basics, 1 of 3)

## Notes

### Project structure

```text
db.js               -> a 100,000-row in-memory SQLite table of posts, shaped on purpose so the sort columns have many ties
pagination.js       -> the two strategies as plain functions: offsetPage and cursorPage, plus the cursor encode and decode
timing.js           -> two tiny helpers for the demos (a timer and a median of 15 runs)
offset-demo.js      -> page-number pagination: the query, the edges, the cost of COUNT(*), why ORDER BY needs an allowlist
offset-cost.js      -> how the cost of OFFSET grows with depth, next to a cursor, with EXPLAIN QUERY PLAN
cursor-demo.js      -> cursor pagination: the cursor itself, limit + 1, bad cursors, the same condition without row values
drift-demo.js       -> what happens when rows are added or deleted between two page requests
ties-demo.js        -> why a unique tie-breaker is required, and the two classic broken cursors
walk-all-pages.js   -> walks all 100,000 rows with offset and with a cursor, while the data changes underneath
pagination-app.js   -> an Express 5 API with both kinds of pagination, Zod validation, Link and X-Total-Count headers
unbounded-demo.js   -> what GET /posts/all costs next to one page
api-check.js        -> calls the real API and prints the JSON, the headers, the 400 errors, and Express 5's read-only req.query
package.json
```

Every list endpoint eventually returns more rows than anyone wants to send, parse or render. Pagination is how an API returns a big list in pieces, and the choice of **how** to cut the list decides whether clients see duplicates, miss rows, or wait longer on every page. It builds on Topic 83, because the page parameters are untrusted input (digits only, a hard cap, an allowlist for the sort column, bound parameters in SQL), on Topic 81, because encoded is not the same as secret and that matters for cursors, and on Topic 77, because a list endpoint is part of REST API design.

Every result below was run on Node 22.22.0 with its built-in `node:sqlite` (SQLite 3.50.4, run with `--disable-warning=ExperimentalWarning`), Express 5.3.0 and Zod 4.6.7. Nothing here needs a browser. All timings come from one machine, are medians of 15 runs (or a single request where it says so), and move from run to run: compare the numbers inside one table with each other, not with the numbers on your machine.

### The data

`db.js` builds a `posts` table with 100,000 rows. The sort columns are not unique on purpose, because pagination bugs live in the ties.

```text
0. the data
   rows: 100000
   distinct created_at values: 20592   (so many posts share a second)
   most posts sharing one created_at: 39
   distinct score values: 101   (about 1,000 posts per score)
```

The table has one index per sort order, and each index ends in `id`:

```sql
CREATE INDEX idx_posts_created ON posts (created_at DESC, id DESC);
CREATE INDEX idx_posts_score ON posts (score DESC, id DESC);
```

### Why paginate at all

`pagination-app.js` has one deliberately bad route, `GET /posts/all`, which returns every row. `unbounded-demo.js` calls it next to the paginated routes:

```text
endpoint                           status     rows          size   time to download      time to parse
GET /posts/all (no pagination)     200   100000 rows      8978.2 KiB  request  1315.0 ms  JSON.parse  144.6 ms
GET /posts/offset (20 per page)    200       20 rows         1.9 KiB  request    16.0 ms  JSON.parse    0.1 ms
GET /posts/cursor (20 per page)    200       20 rows         1.9 KiB  request     8.6 ms  JSON.parse    0.0 ms
GET /posts/offset?pageSize=100     200      100 rows         9.1 KiB  request     7.3 ms  JSON.parse    0.1 ms
```

**Verified directly.** The unbounded response was 8978.2 KiB against 1.9 KiB for a 20-row page. The time moves a lot between runs (the request took 460.3 ms, 509.8 ms and 1315.0 ms in three of my runs of this script), the size does not. An unbounded endpoint also gets worse as the table grows, so it can pass every test on a small database and fall over in production.

The second reason is control. A paginated API has a hard cap (`MAX_PAGE_SIZE = 100` in `pagination.js`), so no client can ask for a page of any size it likes. Stripe's API is a public example of the same design: list calls take a `limit` between 1 and 100 (default 10), plus cursor parameters, and return a `has_more` flag.

### Offset (page-number) pagination

The client sends a page number and a page size. The server turns them into `LIMIT` and `OFFSET`:

```js
const total = db.prepare("SELECT COUNT(*) AS n FROM posts").get().n;
const data = db
  .prepare(`SELECT ${COLUMNS} FROM posts ORDER BY ${column} DESC, id DESC LIMIT ? OFFSET ?`)
  .all(pageSize, (page - 1) * pageSize);
return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
```

`offset = (page - 1) * pageSize`. The `COUNT(*)` is what lets a UI draw "page 3 of 20,000" and jump straight to any page. This is the strength of offset pagination, and it is why page-number interfaces use it.

```text
2. the first pages, 5 per page (newest first)
   page 1: ids 100000, 99999, 99998, 99997, 99996
   page 2: ids 99995, 99994, 99993, 99992, 99991
   page 3: ids 99990, 99989, 99988, 99987, 99986
   meta: {"page":3,"pageSize":5,"total":100000,"totalPages":20000}
```

The edges need a decision. This API returns **200 with an empty list** for a page past the end (and the `meta` says why), and a short last page when the total does not divide evenly:

```text
3. the edges (100,000 rows)
   page 5000 of size 20: 20 rows, totalPages 5000
   page 5001 of size 20:  0 rows, totalPages 5000
   page 3333 of size 30: 30 rows, totalPages 3334
   page 3334 of size 30: 10 rows, totalPages 3334
   page 3335 of size 30:  0 rows, totalPages 3334
```

Returning 404 for a page past the end is another choice. Either is fine if it is documented and consistent. A page that was valid a moment ago can become empty when rows are deleted, which is one reason an empty 200 is friendlier.

The count is not free in general. In SQLite the unfiltered count was almost instant, but a filtered count had to scan every row (there is no index on `author` here):

```text
4. the cost of the total count that page-number UIs need
   SELECT COUNT(*) FROM posts                    : 0.016 ms   (median of 15)
   SELECT COUNT(*) ... WHERE author = 'nadia'    : 7.233 ms   (12,500 matching rows, no index on author)
   the page itself, LIMIT 20 OFFSET 0            : 0.036 ms
```

**Verified directly.** In this run the filtered count cost about 200 times the page itself. Other databases count differently, and that was not run here.

### Deep offsets get slow

`OFFSET 99900` does not jump to row 99,900. The database walks the rows in order and throws away the first 99,900. `offset-cost.js` fetches 100 rows starting at different depths, once with `OFFSET` and once with a cursor that points at the same spot, and checks that both return the same rows:

```text
1. milliseconds to fetch 100 rows starting at position N (median of 15 runs)
position (offset)    OFFSET      cursor      OFFSET / cursor
                0       0.132       0.149         1x   same rows: true
             1000       0.178       0.156         1x   same rows: true
            10000       0.459       0.152         3x   same rows: true
            50000       1.607       0.137        12x   same rows: true
            99900       3.499       0.150        23x   same rows: true
```

The cursor column stays flat. The offset column grows with the depth. The query plans show why. Both use the same index, but one starts at the top and the other starts at the boundary:

```text
2. what the database says it does (EXPLAIN QUERY PLAN)
   OFFSET : [ 'SCAN posts USING INDEX idx_posts_created' ]
   cursor : [ 'SEARCH posts USING INDEX idx_posts_created (created_at<?)' ]
```

Without an index on the sort column the cost is worse and does not depend on the page much, because every request sorts the whole table:

```text
3. the same query with NO index to sort by (a full sort every time)
   plan: [ 'SCAN posts', 'USE TEMP B-TREE FOR ORDER BY' ]
   OFFSET 0     : 45.762 ms
   OFFSET 99900 : 81.613 ms
```

**Verified directly.** At the deepest page the offset query took 23x as long as the cursor query in this run. Across the runs I made of this script the ratio at that depth ranged from 18x to 23x. On a table of 100,000 rows with an index the absolute numbers are small (milliseconds), so offset is fine for small tables and shallow pages. The shape is what matters: cost grows with depth, and a client that walks the whole list pays for the top of the list on every request. Use The Index, Luke describes the same effect, and the SQLite documentation says that with `LIMIT x OFFSET y` it computes `x + y` rows and discards the first `y`.

`EXPLAIN QUERY PLAN` output is for human debugging: the SQLite documentation says applications should not depend on its format, which has changed between releases.

### The data moves while the client pages (drift)

Offset pagination assumes the list does not change between two requests. When it does, "skip the first 5 rows" means a different set of rows. `drift-demo.js` runs three changes between page 1 and page 2, for offset and for a cursor. A new post arrives at the top:

```text
A. a new post is published between page 1 and page 2
   OFFSET  (page=1, then page=2)
     page 1: 100000, 99999, 99998, 99997, 99996
     (post 100001 was just published, so it is now the newest)
     page 2: 99996, 99995, 99994, 99993, 99992
     shown twice: 99996     skipped (above the client's position, never delivered): none
   CURSOR  (first page, then nextCursor)
     page 1: 100000, 99999, 99998, 99997, 99996
     (post 100001 was just published, so it is now the newest)
     page 2: 99995, 99994, 99993, 99992, 99991
     shown twice: none     skipped (above the client's position, never delivered): none
```

The user sees post 99996 twice. A row deleted above the client's position does the opposite and skips one:

```text
B. the user deletes the first post they just saw, between page 1 and page 2
   OFFSET  (page=1, then page=2)
     page 1: 100000, 99999, 99998, 99997, 99996
     (post 100000 was deleted)
     page 2: 99994, 99993, 99992, 99991, 99990
     shown twice: none     skipped (above the client's position, never delivered): 99995
   CURSOR  (first page, then nextCursor)
     page 1: 100000, 99999, 99998, 99997, 99996
     (post 100000 was deleted)
     page 2: 99995, 99994, 99993, 99992, 99991
     shown twice: none     skipped (above the client's position, never delivered): none
```

A cursor survives even the deletion of the very row it points at, because it stores a **position** (the sort value and the id) and not a reference to the row:

```text
C. the last post on page 1 (the one the cursor points at) is deleted before page 2
   OFFSET  (page=1, then page=2)
     page 1: 100000, 99999, 99998, 99997, 99996
     (post 99996 was deleted)
     page 2: 99994, 99993, 99992, 99991, 99990
     shown twice: none     skipped (above the client's position, never delivered): 99995
   CURSOR  (first page, then nextCursor)
     page 1: 100000, 99999, 99998, 99997, 99996
     (post 99996 was deleted)
     page 2: 99995, 99994, 99993, 99992, 99991
     shown twice: none     skipped (above the client's position, never delivered): none
```

Those are small cases. `walk-all-pages.js` scales them up by walking all 100,000 rows, 100 per page, in three scenarios:

```text
scenario                                   method   pages  received  unique  shown twice  original rows missed  time
1. data does not change                    offset    1000    100000  100000            0                     0   1858 ms
1. data does not change                    cursor    1000    100000  100000            0                     0    222 ms
2. a post is published after every page    offset    1011    101010  100000         1010                     0   2205 ms
2. a post is published after every page    cursor    1000    100000  100000            0                     0    398 ms
3. the first post of every page is deleted offset     991     99010   99010            0                   990   2899 ms
3. the first post of every page is deleted cursor    1000    100000  100000            0                     0    572 ms
```

**Verified directly.** With a post published after every page, the offset walk made 1011 requests, received 101010 rows and showed 1010 of them twice. With the first post of every page deleted, it missed 990 of the original rows. The cursor walk was exact in all three. The cursor walk in scenario 2 never sees the new posts: they are newer than the position the walk started from, which is the correct behavior for a client that is reading its way down a list. Total time for the offset walk was 8.4x the cursor walk in scenario 1 in this run.

### Ties: pagination needs a total order

Sorting by `score` or `created_at` leaves many rows tied, and SQL does not say which tied row comes first. Pagination needs the order to be **total** and **repeatable**. `ties-demo.js` makes a 12-row table (`score = id % 3`) and runs the same query before and after `CREATE INDEX`:

```text
1. the same query, before and after CREATE INDEX p_score ON p(score)  (12 rows, score = id % 3)
   ORDER BY score DESC          before: 2,5,8,11,1,4,7,10,3,6,9,12          after: 11,8,5,2,10,7,4,1,12,9,6,3          same: false
   ORDER BY score DESC, id DESC before: 11,8,5,2,10,7,4,1,12,9,6,3          after: 11,8,5,2,10,7,4,1,12,9,6,3          same: true
```

Nothing in the query changed, only an index was added, and the order of the tied rows reversed. A client paging 5 at a time across that moment gets a repeat and a skip:

```text
2. paging 5 at a time, while the plan changes (an index is added) between page 1 and page 2
   ORDER BY score DESC          page 1: 2,5,8,11,1   page 2: 7,4,1,12,9   shown twice: 1   skipped: 10
   ORDER BY score DESC, id DESC page 1: 11,8,5,2,10   page 2: 7,4,1,12,9   shown twice: none   skipped: none
```

**Verified directly.** The fix is to end every `ORDER BY` with a unique column, usually the primary key: `ORDER BY score DESC, id DESC`. The tie-breaker makes the order the same on every request, whatever plan the database picks. Both functions in `pagination.js` do this, and both indexes end in `id`.

### Cursor (keyset) pagination

A cursor says "give me the rows **after this one**" instead of "skip N rows". The client sends back the position of the last row it received. The server turns that into a `WHERE` clause:

```js
where = `WHERE (${column}, id) < (?, ?)`; // "strictly after the last row I saw", as one row comparison
// ...
const rows = db.prepare(`SELECT ${COLUMNS} FROM posts ${where} ORDER BY ${column} DESC, id DESC LIMIT ?`).all(...params, limit + 1);
const hasNext = rows.length > limit;
if (hasNext) rows.pop();
```

Three details matter here.

1. **Row-value comparison.** `(created_at, id) < (?, ?)` compares left to right, like sorting a pair, so it means "created earlier, or created at the same time with a lower id". SQLite has supported row values since 3.15.0, and its documentation shows this exact pagination pattern and says it is much more efficient than `OFFSET` with an appropriate index.
2. **`limit + 1`.** The query asks for one more row than the page size. If it comes back, there is a next page, and no `COUNT(*)` is needed. It also avoids the empty extra page.
3. **The cursor holds the sort value and the id.** Not just the sort value, as the next section shows.

Following the cursor for three pages of 5, with the cursor decoded:

```text
1. three pages of 5, following nextCursor
   page 1: ids 100000, 99999, 99998, 99997, 99996   hasNext true
           nextCursor eyJzIjoiY3JlYXRlZF9hdCIsInYiOlsxNzAwMDIwNTkwLDk5OTk2XX0
           decoded    {"s":"created_at","v":[1700020590,99996]}
   page 2: ids 99995, 99994, 99993, 99992, 99991   hasNext true
           nextCursor eyJzIjoiY3JlYXRlZF9hdCIsInYiOlsxNzAwMDIwNTkwLDk5OTkxXX0
           decoded    {"s":"created_at","v":[1700020590,99991]}
   page 3: ids 99990, 99989, 99988, 99987, 99986   hasNext true
           nextCursor eyJzIjoiY3JlYXRlZF9hdCIsInYiOlsxNzAwMDIwNTg4LDk5OTg2XX0
           decoded    {"s":"created_at","v":[1700020588,99986]}
```

The last page needs no extra empty request. With a limit of 50,000 on 100,000 rows:

```text
2. the last page: no COUNT(*), no empty extra page
   page 1: 50000 rows, hasNext true
   page 2: 50000 rows, hasNext false, nextCursor null
   (the query asked for limit + 1 rows; page 2 got exactly 50,000, so it knew there was nothing after it)
```

It works for any sort order that has an index ending in `id`. Sorting by `score`, where about a thousand rows share each value, the ties are broken by `id`:

```text
3. a different sort order: score (highest first, ties broken by id)
   page 1: id 99992 (score 100), id 99849 (score 100), id 99583 (score 100), id 99408 (score 100)
   page 2: id 99407 (score 100), id 99394 (score 100), id 99371 (score 100), id 99224 (score 100)
   cursor: {"s":"score","v":[100,99408]}
```

### The two classic broken cursors

Cursor pagination is easy to get slightly wrong. `ties-demo.js` walks all 100,000 rows, 100 at a time, with three kinds of cursor.

```text
3. walking 100,000 rows, 100 at a time, with different kinds of cursor
   cursor = last created_at only, "<"   : received 96467, unique 96467, rows NEVER returned: 3533
   cursor = (created_at, id), "<"        : received 100000, unique 100000, rows never returned: 0
```

A cursor that remembers only the sort column (`WHERE created_at < ?`) silently skips every row that shares a timestamp with the last row of a page but did not fit on it. The "fix" people reach for is `<=`, which fails the other way. On the `score` sort:

```text
   the '<=' version, sorting by score (about 1,000 rows share each score), first four pages:
     page 1: first id 99992, last id 90316, last score 100
     page 2: first id 99992, last id 90316, last score 100
     page 3: first id 99992, last id 90316, last score 100
     page 4: first id 99992, last id 90316, last score 100
   the same 100 rows come back every time: a client that follows this cursor never reaches the end.
```

**Verified directly.** The `<` cursor never returned 3533 of the 100,000 rows, and it did not raise an error. The `<=` cursor returned the same 100 rows forever. Only `(sort value, id)` with a strict comparison was exact. Neither broken version fails on small, tidy test data, which is why they survive to production.

### Row values versus spelling it out

Not every database supports row values, and where it does not you write the comparison out: `created_at < ? OR (created_at = ? AND id < ?)`. `cursor-demo.js` walks the whole table both ways and then looks at the plan near the end of the table:

```text
5. the same condition written without row values: same rows, different plan
   walking all 100,000 rows, 100 at a time: row-value 100000 rows, spelled-out 100000 rows, same order: true
   row value : 0.239 ms near the end of the table, plan ["SEARCH posts USING INDEX idx_posts_created (created_at<?)"]
   spelled out: 7.076 ms near the end of the table, plan ["SCAN posts USING INDEX idx_posts_created"]
```

**Verified directly.** Both forms return the same rows in the same order, but in SQLite the `OR` form was planned as a scan from the top of the index, which brings back the cost of a deep offset. Only SQLite was run here. If your database lacks row values, check the plan of the spelled-out form with its own `EXPLAIN` before you trust it.

### The cursor is a position, not a secret

The cursor in this API is base64url of a small JSON document. That is **encoding, not protection** (Topic 81): anyone can decode it, and anyone can make one. Clients should treat it as opaque, and the server must treat it as untrusted input. `decodeCursor` accepts only `{"s": <sort name>, "v": [<integer>, <integer>]}`, with the sort name matching the request, and the values go into the query as bound parameters:

```text
4. cursors are not secret, and bad ones are rejected
   not base64 at all                          -> CursorError: cursor is not valid
   valid base64, not JSON                     -> CursorError: cursor is not valid
   empty object                               -> CursorError: cursor is not valid for this request
   a SQL string where a number belongs        -> CursorError: cursor is not valid for this request
   a fractional number                        -> CursorError: cursor is not valid for this request
   a score cursor sent with sort=created_at   -> CursorError: cursor is not valid for this request
   a created_at cursor sent with sort=score   -> CursorError: cursor is not valid for this request
   posts table still has 100000 rows after the SQL-string attempt
   a made-up but well-formed cursor -> accepted, starts at ids 510, 509, 508   (the cursor is a position, not a permission)
   decodeCursor on it: [1700000100,1]
```

**Verified directly.** A made-up cursor is accepted, because a well-formed position is a legitimate request: it starts the list at a different place. So never put anything in a cursor that grants access, and apply the same authorization and filters to every page request as to the first one. A cursor that was signed (an HMAC over its contents) would make forged cursors detectable. That was not built or run here. A cursor that carries filters or several sort columns was not built either.

### Wiring it into Express

The page parameters arrive as strings in the query string. `pagination-app.js` validates them with Zod before anything touches the database:

```js
const wholeNumber = (min, max) => z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));

const sort = z.enum(Object.keys(SORTS));

const offsetQuery = z.strictObject({
  page: wholeNumber(1, 1_000_000).default(1),
  pageSize: wholeNumber(1, MAX_PAGE_SIZE).default(20),
  sort: sort.default("created_at"),
});
```

`z.strictObject` rejects unknown parameters, the regex rejects anything but digits (Topic 83 explains why this beats `z.coerce`), the cap stops a client from asking for a page of any size, and the `enum` is the sort allowlist. Here is what the real server does with bad requests:

```text
4. bad requests are refused with 400 and a reason
   /posts/offset?pageSize=1000                                    -> 400  pageSize: Too big: expected number to be <=100
   /posts/offset?pageSize=abc                                     -> 400  pageSize: Invalid string: must match pattern /^\d+$/
   /posts/offset?page=0                                           -> 400  page: Too small: expected number to be >=1
   /posts/offset?page=1.5                                         -> 400  page: Invalid string: must match pattern /^\d+$/
   /posts/offset?page=                                            -> 400  page: Invalid string: must match pattern /^\d+$/
   /posts/offset?page=1e3                                         -> 400  page: Invalid string: must match pattern /^\d+$/
   /posts/offset?sort=score;DROP%20TABLE%20posts                  -> 400  sort: Invalid option: expected one of "created_at"|"score"
   /posts/offset?foo=1                                            -> 400  (query): Unrecognized key: "foo"
   /posts/cursor?cursor=not-a-cursor                              -> 400  invalid_cursor: cursor is not valid
   /posts/cursor?sort=score&cursor=eyJzIjoiY3JlYXRlZF9hdCIsInYiOl -> 400  invalid_cursor: cursor is not valid for this request
```

**Why the sort column needs an allowlist.** `ORDER BY` takes a column name, and a bound parameter is a **value**, so it cannot stand in for one. The column name has to be part of the SQL text, which means it must come from a fixed list (`SORTS` in `pagination.js`) and never straight from the request. Worse, binding it does not fail, it quietly does nothing:

```text
5. ORDER BY cannot be a bound parameter (20 rows, no index, so nothing else decides the order)
   ORDER BY score DESC (in the SQL text)    19:98 14:92 10:88 16:82 7:80
   ORDER BY ? DESC, bound to 'score'        1:66 2:63 3:68 4:17 5:71
   ORDER BY ? DESC, bound to 'nonsense'     1:66 2:63 3:68 4:17 5:71
   (id:score pairs. A bound value is data, so it is a constant: no sorting, and no error for a column that does not exist.)
```

**Verified directly.** The bound `ORDER BY ?` returned the rows in storage order for `'score'` and for `'nonsense'` alike, with no error. (The demo uses a table with no index. An earlier version of this demo ran with the indexes in place and the bound `ORDER BY ?` appeared to work, most likely because the query was covered by the `score` index and the rows came back in that order anyway. That cause was not checked, but it shows how easily this bug hides.) Run it once with an invalid column name and you will not notice a thing, which is the dangerous part.

This code also depends on one Express 5 detail. `req.query` is a read-only getter, so the validated copy cannot be assigned back onto it. The middleware stores it in `res.locals.query`:

```text
6. Express 5: req.query is read-only, which is why pagination-app.js keeps the parsed copy in res.locals.query
   strict mode : {"outcome":"TypeError: Cannot set property query of #<IncomingMessage> which has only a getter","queryStillIs":{"page":"1"}}
   sloppy mode : {"queryAfterAssignment":{"page":"1"}}
```

In strict mode the assignment throws, and outside strict mode it is silently ignored. In both cases `req.query` keeps its original, unvalidated strings, so reading `req.query` after "validating" it is a bug that does not announce itself.

### What the response looks like: body, Link header, total

The body of a cursor response holds the rows, a small `meta` object and the next cursor. The server also sends an RFC 8288 `Link` header, with relative URLs, so a client can follow `rel="next"` without building a URL:

```text
1. GET /posts/offset?page=2&pageSize=3
   status: 200
   Link: </posts/offset?page=1&pageSize=3&sort=created_at>; rel="first", </posts/offset?page=1&pageSize=3&sort=created_at>; rel="prev", </posts/offset?page=3&pageSize=3&sort=created_at>; rel="next", </posts/offset?page=33334&pageSize=3&sort=created_at>; rel="last"
   X-Total-Count: 100000
   meta: {"page":2,"pageSize":3,"total":100000,"totalPages":33334}   ids: 99997, 99996, 99995
```

RFC 8288 defines the `Link` header and how its values are written. The relation names `first`, `prev`, `next` and `last` come from the IANA link relations registry (where `previous` is listed as a synonym of `prev`). `X-Total-Count` is a widespread convention, and I did not find it in a standard. The offset route puts the total in the header and in `meta`. The cursor route sends a `Link` header with `rel="next"` only, and only while there is a next page:

```text
3. GET /posts/cursor?limit=3, then follow rel="next" from the Link header
   page 1 ids: 100000, 99999, 99998  meta: {"limit":3,"hasNext":true}
   Link: </posts/cursor?limit=3&sort=created_at&cursor=eyJzIjoiY3JlYXRlZF9hdCIsInYiOlsxNzAwMDIwNTkwLDk5OTk4XX0>; rel="next"
   page 2 ids: 99997, 99996, 99995  (offset page 2 of size 3 was: 99997, 99996, 99995)
   7 posts, limit 5: page 1 has 5 rows and a Link header: true
                     page 2 has 2 rows, hasNext false, nextCursor null, a Link header: false
```

**Verified directly.** Following the `Link` header from the cursor route returned the same rows as offset page 2 of size 3 on an unchanged table, and on a 7-post table the last page had no `Link` header and `nextCursor` was `null`. The same script publishes a post with `POST /posts` and checks that it appears first in both listings:

```text
5. publish a post, then look at both listings
   POST /posts -> 201 {"id":100001}
   offset first page ids: 100001, 100000   total now: 100001
   cursor first page ids: 100001, 100000
```

Whether to put the pagination data in the body, in headers, or both is a design choice. Putting it in the body is easy for browser code to read. Headers keep the body a plain array. If a browser on another origin has to read `Link` or `X-Total-Count`, CORS must expose them with `Access-Control-Expose-Headers` (Topic 82). That was not run here.

### Choosing between them

| | Offset (page number) | Cursor (keyset) |
| --- | --- | --- |
| Jump to page N | Yes | No |
| Total count and "page 3 of 20,000" | Yes, at the price of a `COUNT(*)` | No (no cheap total) |
| Cost of a deep page | Grows with depth (23x at the deepest page here) | Flat |
| Rows added or deleted while paging | Repeats and skips rows | Stable |
| Needs a tie-breaker | Yes | Yes, and it must be in the cursor |
| Needs an index per sort order | Strongly advised: without one every page sorts the whole table (observed) | Yes, to seek instead of scan (not run without an index) |
| Going backwards | Free (page - 1) | Extra work: reverse the comparison and the sort |
| Good for | Admin tables, small lists, "go to page 7" | Feeds, infinite scroll, exports, large or fast-changing tables, public APIs |

Use The Index, Luke names the same drawbacks of the seek method: it is harder to write correctly, you cannot jump to an arbitrary page, and browsing backwards means reversing the comparisons and the sort order. A reasonable default for a new public API is the cursor, with a hard cap on the page size. Reach for offset when users really need page numbers and the list stays modest in size.

### What this topic does not cover

- **Prisma** (`take`, `skip` and a `cursor` option) and **MongoDB** (a range query on `_id`, or on a sort field plus `_id`). Both are common ways to do the same two strategies in a JavaScript backend. Neither was run here.
- **PostgreSQL and MySQL**: the plans, the cost of `COUNT(*)`, and how well each database uses an index for row-value comparisons. Only SQLite was run.
- **Backward cursors** (a `prev` cursor), **filters combined with cursors**, **signed or encrypted cursors**, and **GraphQL connections** (the Relay cursor style).
- **Caching** the total count, and **rate limiting** the list routes. Those are the next two topics.
- **Concurrent clients and a real network**: everything ran in one process on `localhost`.

### Common mistakes

| Mistake | What happens |
| --- | --- |
| No cap on the page size, or no pagination at all | One request returned 100,000 rows, 8978.2 KiB. Observed. |
| `ORDER BY created_at` with no unique tie-breaker | The order of tied rows is undefined, and it reversed when an index was added: repeats and skips. Observed. |
| A cursor holding only the sort column, with `<` | 3533 of 100,000 rows were never returned, with no error. Observed. |
| The same cursor with `<=` | The same 100 rows came back on every page: the client never finishes. Observed. |
| Offset pagination to export or walk a big table | The deepest page took 23x as long as the cursor; a walk with inserts repeated 1010 rows, and a walk with deletes missed 990. Observed. |
| Spelling the keyset condition as an `OR` in SQLite | Same rows, but a scan instead of a seek (7.076 ms against 0.239 ms near the end). Observed. |
| Taking the sort column name from the request | `ORDER BY` cannot be a bound parameter, so it goes into the SQL text: use an allowlist. Observed. |
| Binding the sort column as a parameter to "be safe" | It silently sorts nothing and raises no error. Observed. |
| Reading `req.query` after validating it, in Express 5 | It still holds the raw strings; assigning to it throws in strict mode. Observed. |
| Treating the cursor as a secret or as permission | A made-up cursor was accepted and started the list elsewhere. Observed. |
| Counting on every request | The filtered count cost about 200 times the page itself in this run. Observed. |
| A cursor that stores only a row id and looks the row up | It depends on that row still existing (reasoned, not run). The value cursor used here survived the deletion of its own row. Observed. |

### Practical tips

- Always paginate list endpoints, and enforce a maximum page size on the server, whatever the client asks for.
- End every `ORDER BY` with a unique column, and put that column in the index as the last key.
- Prefer a cursor for feeds, exports and any list that changes while people read it. Keep offset for small tables and for UIs that truly need page numbers.
- Put the sort name inside the cursor, and reject a cursor that does not match the request's sort.
- Use a strict comparison on the pair, `(sort value, id)`, never on the sort value alone.
- Ask for `limit + 1` rows to learn whether there is a next page instead of running a count.
- Validate every page parameter as untrusted input: digits only, a range, an enum for the sort, no unknown keys.
- Treat the cursor as untrusted input too, and apply the same authorization and filters to every page.
- Return a consistent, documented response for a page past the end, and tell clients how to follow the next page (a `Link` header or a `nextCursor`).
- Check the query plan (`EXPLAIN`) for the exact SQL you ship, not only for the SQL you meant to write.

## Resources

- Use The Index, Luke, Paging Through Results (the offset and seek methods): <https://use-the-index-luke.com/sql/partial-results/fetch-next-page>
- SQLite, Row Values (comparison, and the scrolling-window pagination example): <https://www.sqlite.org/rowvalue.html>
- SQLite, EXPLAIN QUERY PLAN: <https://www.sqlite.org/eqp.html>
- RFC 8288, Web Linking (the `Link` header): <https://www.rfc-editor.org/rfc/rfc8288>
- IANA, Link Relations registry (`first`, `prev`, `next`, `last`): <https://www.iana.org/assignments/link-relations/link-relations.xhtml>
- MDN, Link header: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Link>
- Stripe, API pagination (a public cursor-based list API): <https://docs.stripe.com/api/pagination>

## Practice

1. In `pagination.js`, remove `, id DESC` from the `ORDER BY` of `cursorPage` and from the `WHERE` comparison so it uses only the sort column, then run `ties-demo.js` and `walk-all-pages.js`. Predict how many rows go missing before you run it, then explain the number in terms of how many rows share each timestamp.
2. Add a third sort, `author`, to `SORTS` in `pagination.js` with an index that ends in `id`. Run `cursor-demo.js` for it. The cursor holds an integer today, so work out what has to change in `encodeCursor`, `decodeCursor` and the Zod schema to carry a text value safely.
3. Edit `offset-cost.js` to call `createDatabase({ rows: 1_000_000 })` and run it. Write down at which depth offset pagination becomes slow enough that you would refuse to serve it, and what you would do for clients that need that depth.
4. Add a `prev` cursor to `/posts/cursor`: reverse the comparison and the `ORDER BY`, then reverse the rows before returning them. Write a script like `drift-demo.js` that pages forward twice and back once, and checks that it returns to the same rows.
5. Add a filter such as `?author=nadia` to the cursor route. Decide whether the filter must be part of the cursor, what a client could do if it changed the filter between two pages, and write the check that rejects it.

## Code Example

- [db.js](./01-pagination/db.js)
- [pagination.js](./01-pagination/pagination.js)
- [timing.js](./01-pagination/timing.js)
- [offset-demo.js](./01-pagination/offset-demo.js)
- [offset-cost.js](./01-pagination/offset-cost.js)
- [cursor-demo.js](./01-pagination/cursor-demo.js)
- [drift-demo.js](./01-pagination/drift-demo.js)
- [ties-demo.js](./01-pagination/ties-demo.js)
- [walk-all-pages.js](./01-pagination/walk-all-pages.js)
- [pagination-app.js](./01-pagination/pagination-app.js)
- [unbounded-demo.js](./01-pagination/unbounded-demo.js)
- [api-check.js](./01-pagination/api-check.js)

To run it yourself, run `npm install` in the project folder. You need a Node.js version that includes the built-in `node:sqlite` module (this was run on 22.22.0, and I did not test other versions). Every script is also an npm script, and none of them needs a browser:

```text
npm run offset-demo
npm run offset-cost
npm run cursor-demo
npm run drift-demo
npm run ties-demo
npm run walk-all-pages
npm run unbounded-demo
npm run api-check
```

`walk-all-pages` walks 100,000 rows three times in two ways and takes several seconds. To try the API by hand, run `npm start` (it listens on port 4970, or pass another port to `node --disable-warning=ExperimentalWarning pagination-app.js`), then request `http://localhost:4970/posts/cursor?limit=2` and follow the `Link` header, or `http://localhost:4970/posts/offset?page=3&pageSize=2`. `POST /posts` with a JSON body such as `{"title":"Hello","author":"nadia","score":7}` publishes a post so you can watch pages move. The data lives in memory and is rebuilt, identically, each time the server starts. The `/posts/all` route is deliberately unbounded: do not copy it.
