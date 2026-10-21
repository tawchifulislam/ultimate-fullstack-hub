// api-check.js
// Calls the real Express API (pagination-app.js) and prints what comes back:
// the JSON envelope, the Link and X-Total-Count headers, the edges, the 400 errors,
// a new post showing up at the top of both kinds of listing, and Express 5's read-only req.query.
//
//   node --disable-warning=ExperimentalWarning api-check.js

const express = require("express");
const { createApp } = require("./pagination-app");
const { createDatabase } = require("./db");

async function main() {
  const server = await new Promise((resolve) => { const s = createApp().listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;

  async function call(path, options) {
    const res = await fetch(base + path, options);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, headers: res.headers, body };
  }
  const ids = (r) => r.body.data.map((x) => x.id).join(", ");

  console.log("== 1. GET /posts/offset?page=2&pageSize=3");
  const o = await call("/posts/offset?page=2&pageSize=3");
  console.log("   status:", o.status);
  console.log("   Link:", o.headers.get("link"));
  console.log("   X-Total-Count:", o.headers.get("x-total-count"));
  console.log("   meta:", JSON.stringify(o.body.meta), "  ids:", ids(o));

  console.log("\n== 2. the last page, and a page past the end (pageSize 20, 5000 pages)");
  const last = await call("/posts/offset?page=5000");
  console.log(`   page 5000: ${last.status}, ${last.body.data.length} rows, Link: ${last.headers.get("link")}`);
  const beyond = await call("/posts/offset?page=5001");
  console.log(`   page 5001: ${beyond.status}, ${beyond.body.data.length} rows, Link: ${beyond.headers.get("link")}`);

  console.log("\n== 3. GET /posts/cursor?limit=3, then follow rel=\"next\" from the Link header");
  const c1 = await call("/posts/cursor?limit=3");
  console.log("   page 1 ids:", ids(c1), " meta:", JSON.stringify(c1.body.meta));
  console.log("   Link:", c1.headers.get("link"));
  const nextUrl = c1.headers.get("link").match(/<([^>]+)>/)[1];
  const c2 = await call(nextUrl);
  console.log("   page 2 ids:", ids(c2), " (offset page 2 of size 3 was:", ids(o) + ")");

  // The end of a cursor walk, on a small database (7 posts) so the end is two requests away.
  const small = await new Promise((resolve) => { const s = createApp({ db: createDatabase({ rows: 7 }) }).listen(0, () => resolve(s)); });
  const smallBase = `http://localhost:${small.address().port}`;
  const e1 = await fetch(`${smallBase}/posts/cursor?limit=5`);
  const e1Body = await e1.json();
  const e2 = await fetch(smallBase + e1.headers.get("link").match(/<([^>]+)>/)[1]);
  const e2Body = await e2.json();
  console.log(`   7 posts, limit 5: page 1 has ${e1Body.data.length} rows and a Link header: ${e1.headers.has("link")}`);
  console.log(`                     page 2 has ${e2Body.data.length} rows, hasNext ${e2Body.meta.hasNext}, nextCursor ${e2Body.nextCursor}, a Link header: ${e2.headers.has("link")}`);
  small.close();

  console.log("\n== 4. bad requests are refused with 400 and a reason");
  const bad = [
    "/posts/offset?pageSize=1000",
    "/posts/offset?pageSize=abc",
    "/posts/offset?page=0",
    "/posts/offset?page=1.5",
    "/posts/offset?page=",
    "/posts/offset?page=1e3",
    "/posts/offset?sort=score;DROP%20TABLE%20posts",
    "/posts/offset?foo=1",
    "/posts/cursor?cursor=not-a-cursor",
    "/posts/cursor?sort=score&cursor=" + Buffer.from(JSON.stringify({ s: "created_at", v: [1700000100, 1] })).toString("base64url"),
  ];
  for (const path of bad) {
    const r = await call(path);
    const why = r.body.issues ? r.body.issues.map((i) => `${i.field}: ${i.message}`).join("; ") : `${r.body.error}: ${r.body.message}`;
    console.log(`   ${path.slice(0, 62).padEnd(62)} -> ${r.status}  ${why.slice(0, 80)}`);
  }

  console.log("\n== 5. publish a post, then look at both listings");
  const created = await call("/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Hello", author: "nadia", score: 7 }) });
  console.log(`   POST /posts -> ${created.status} ${JSON.stringify(created.body)}`);
  const after = await call("/posts/offset?pageSize=2");
  const afterCursor = await call("/posts/cursor?limit=2");
  console.log("   offset first page ids:", ids(after), "  total now:", after.body.meta.total);
  console.log("   cursor first page ids:", ids(afterCursor));
  const badBody = await call("/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "", author: "nadia", score: 500, extra: 1 }) });
  console.log(`   POST /posts with a bad body -> ${badBody.status}`);
  for (const i of badBody.body.issues) console.log(`     ${i.field}: ${i.message}`);

  console.log("\n== 6. Express 5: req.query is read-only, which is why pagination-app.js keeps the parsed copy in res.locals.query");
  const probeApp = express();
  probeApp.get("/strict", (req, res) => {
    "use strict";
    try { req.query = { page: "9" }; res.json({ outcome: "assignment worked" }); }
    catch (err) { res.json({ outcome: `${err.constructor.name}: ${err.message}`, queryStillIs: req.query }); }
  });
  probeApp.get("/sloppy", function (req, res) {
    req.query = { page: "9" }; // outside strict mode the assignment is silently ignored
    res.json({ queryAfterAssignment: req.query });
  });
  const probeServer = await new Promise((resolve) => { const s = probeApp.listen(0, () => resolve(s)); });
  const probeBase = `http://localhost:${probeServer.address().port}`;
  console.log("   strict mode :", JSON.stringify(await (await fetch(`${probeBase}/strict?page=1`)).json()));
  console.log("   sloppy mode :", JSON.stringify(await (await fetch(`${probeBase}/sloppy?page=1`)).json()));
  probeServer.close();

  server.close();
}

main().catch((err) => {
  console.error("api-check failed:", err.message);
  process.exit(1);
});
