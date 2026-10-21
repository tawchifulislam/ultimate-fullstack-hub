// pagination-app.js
// An Express 5 API over the 100,000-post database, with both kinds of pagination.
//
//   node --disable-warning=ExperimentalWarning pagination-app.js [port]      (default 4970)
//
//   GET  /posts/offset?page=1&pageSize=20&sort=created_at      page numbers, total count, Link header
//   GET  /posts/cursor?limit=20&sort=created_at&cursor=...     cursor, no total, Link header
//   GET  /posts/all                                            DELIBERATELY unbounded. Do not copy.
//   POST /posts                                                publishes a post (so you can watch pages drift)
//
// Query parameters are validated with Zod (Topic 83): digits only, a hard cap on the page size,
// a sort allowlist, and unknown parameters rejected.

const express = require("express");
const { z } = require("zod");
const { createDatabase, addPost } = require("./db");
const { SORTS, MAX_PAGE_SIZE, CursorError, offsetPage, cursorPage } = require("./pagination");

// "12" -> 12, but "", "1.5", "-3", "1e3", "abc" and "0x10" are rejected (Topic 83: do not use z.coerce here).
const wholeNumber = (min, max) => z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));
const sort = z.enum(Object.keys(SORTS));

const offsetQuery = z.strictObject({
  page: wholeNumber(1, 1_000_000).default(1),
  pageSize: wholeNumber(1, MAX_PAGE_SIZE).default(20),
  sort: sort.default("created_at"),
});
const cursorQuery = z.strictObject({
  limit: wholeNumber(1, MAX_PAGE_SIZE).default(20),
  sort: sort.default("created_at"),
  cursor: z.string().max(500).optional(),
});
const newPost = z.strictObject({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(50),
  score: z.number().int().min(0).max(100),
});

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "invalid_query",
        issues: result.error.issues.map((i) => ({ field: i.path.join(".") || "(query)", message: i.message })),
      });
    }
    res.locals.query = result.data; // Express 5's req.query is read-only, so the parsed copy goes here
    next();
  };
}

// RFC 8288 Link header, with relative URLs. Clients can follow rel="next" without building URLs.
const linkHeader = (links) => links.map(([rel, url]) => `<${url}>; rel="${rel}"`).join(", ");

function createApp({ db = createDatabase() } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/posts/offset", validateQuery(offsetQuery), (req, res) => {
    const { page, pageSize, sort } = res.locals.query;
    const result = offsetPage(db, { page, pageSize, sort });
    const { totalPages, total } = result.meta;
    const url = (p) => `${req.baseUrl}${req.path}?${new URLSearchParams({ page: p, pageSize, sort })}`;
    const links = [["first", url(1)]];
    if (page > 1) links.push(["prev", url(Math.min(page - 1, totalPages))]);
    if (page < totalPages) links.push(["next", url(page + 1)]);
    links.push(["last", url(totalPages)]);
    res.set("Link", linkHeader(links));
    res.set("X-Total-Count", String(total));
    res.json(result); // a page past the end is a normal 200 with an empty list, plus the meta that says why
  });

  app.get("/posts/cursor", validateQuery(cursorQuery), (req, res) => {
    const { limit, sort, cursor } = res.locals.query;
    let result;
    try {
      result = cursorPage(db, { cursor, limit, sort });
    } catch (err) {
      if (err instanceof CursorError) return res.status(400).json({ error: "invalid_cursor", message: err.message });
      throw err;
    }
    if (result.nextCursor) {
      const next = new URLSearchParams({ limit, sort, cursor: result.nextCursor });
      res.set("Link", linkHeader([["next", `${req.baseUrl}${req.path}?${next}`]]));
    }
    res.json(result);
  });

  // The anti-pattern: everything, every time.
  app.get("/posts/all", (req, res) => {
    res.json(db.prepare("SELECT id, title, author, score, created_at FROM posts ORDER BY created_at DESC, id DESC").all());
  });

  app.post("/posts", (req, res) => {
    const parsed = newPost.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body", issues: parsed.error.issues.map((i) => ({ field: i.path.join(".") || "(body)", message: i.message })) });
    res.status(201).json({ id: addPost(db, parsed.data) });
  });

  app.use((err, req, res, next) => res.status(500).json({ error: "internal_error" }));
  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const port = process.argv[2] || 4970;
  createApp().listen(port, () => console.log(`pagination-app listening on http://localhost:${port}`));
}
