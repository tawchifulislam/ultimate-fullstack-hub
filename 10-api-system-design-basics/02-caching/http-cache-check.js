// http-cache-check.js
// Calls http-cache-app.js and prints the caching headers, the ETag / 304 conversation, and how
// much work the server really did. The requests are sent with node:http so that the ONLY headers
// on them are the ones written here. (Node's fetch changes a request that carries If-None-Match:
// section 5 shows what it does to the 304.) Real browser caching is in browser-cache-lab.js.
//
//   node --disable-warning=ExperimentalWarning http-cache-check.js

const http = require("node:http");
const { createApp } = require("./http-cache-app");

function rawRequest(port, method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "localhost", port, path, method, headers, agent: false }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const { app, state, log } = createApp();
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const port = server.address().port;
  const get = (path, headers) => rawRequest(port, "GET", path, headers);
  const h = (r, name) => r.headers[name] ?? "(none)";
  const runs = (name) => state.handlerRuns[name] || 0;

  console.log("== 1. what each route sends");
  console.log(`   ${"route".padEnd(11)} status  ${"Cache-Control".padEnd(38)} ${"ETag".padEnd(35)} Last-Modified`);
  for (const path of ["/max-age", "/no-cache", "/no-store", "/immutable", "/heuristic"]) {
    const r = await get(path);
    console.log(`   ${path.padEnd(11)} ${r.status}     ${h(r, "cache-control").padEnd(38)} ${h(r, "etag").padEnd(35)} ${h(r, "last-modified") === "(none)" ? "(none)" : "(a date)"}`);
  }
  console.log("   Express added the ETag by itself for every res.json() body. /heuristic has no Cache-Control at all.");

  console.log("\n== 2. the conditional request: ETag, If-None-Match, 304");
  const runsBefore = runs("/no-cache");
  const first = await get("/no-cache");
  const etag = h(first, "etag");
  console.log(`   GET /no-cache                                  -> ${first.status}, body ${first.body.length} bytes, ETag ${etag}`);
  const second = await get("/no-cache", { "If-None-Match": etag });
  console.log(`   GET /no-cache, If-None-Match: that ETag        -> ${second.status}, body ${second.body.length} bytes`);
  console.log(`   the handler ran ${runs("/no-cache") - runsBefore} times for those two requests (a 304 saves the download, not the work)`);
  const other = await get("/no-cache", { "If-None-Match": 'W/"something-else"' });
  console.log(`   GET /no-cache, If-None-Match: a different tag  -> ${other.status}, body ${other.body.length} bytes`);
  await rawRequest(port, "POST", "/bump");
  const afterChange = await get("/no-cache", { "If-None-Match": etag });
  console.log(`   after POST /bump, the old tag is sent again    -> ${afterChange.status}, body ${afterChange.body}, new ETag ${h(afterChange, "etag")}`);

  console.log("\n== 3. last-modified works the same way: If-Modified-Since");
  const lm = h(await get("/heuristic"), "last-modified");
  const ims = await get("/heuristic", { "If-Modified-Since": lm });
  console.log(`   GET /heuristic, If-Modified-Since: its own Last-Modified -> ${ims.status}, body ${ims.body.length} bytes`);

  console.log("\n== 4. an expensive route that checks the validator BEFORE doing the work (/report: a real SQLite query)");
  const timed = async (headers) => { const start = process.hrtime.bigint(); const r = await get("/report", headers); return { r, ms: Number(process.hrtime.bigint() - start) / 1e6 }; };
  const queriesStart = state.reportQueries;
  const a = await timed();
  const reportTag = h(a.r, "etag");
  console.log(`   GET /report                      -> ${a.r.status}, ${a.ms.toFixed(1).padStart(6)} ms, body ${String(a.r.body.length).padStart(3)} bytes, ETag ${reportTag}, queries run: ${state.reportQueries - queriesStart}`);
  const b = await timed({ "If-None-Match": reportTag });
  console.log(`   GET /report, If-None-Match       -> ${b.r.status}, ${b.ms.toFixed(1).padStart(6)} ms, body ${String(b.r.body.length).padStart(3)} bytes, queries run: ${state.reportQueries - queriesStart}`);
  await rawRequest(port, "POST", "/bump");
  const c = await timed({ "If-None-Match": reportTag });
  console.log(`   after POST /bump, same tag sent  -> ${c.r.status}, ${c.ms.toFixed(1).padStart(6)} ms, body ${String(c.r.body.length).padStart(3)} bytes, ETag ${h(c.r, "etag")}, queries run: ${state.reportQueries - queriesStart}`);

  console.log("\n== 5. a gotcha: Node's fetch adds Cache-Control: no-cache to a request that carries If-None-Match");
  const tag = h(await get("/max-age"), "etag");
  const viaHttp = await get("/max-age", { "If-None-Match": tag });
  const mark = log.length;
  const viaFetch = await fetch(`http://localhost:${port}/max-age`, { headers: { "If-None-Match": tag } });
  await viaFetch.text();
  const seen = log.slice(mark).find((e) => e.path === "/max-age");
  console.log(`   node:http, If-None-Match: ${tag}  -> ${viaHttp.status}`);
  console.log(`   fetch,     If-None-Match: ${tag}  -> ${viaFetch.status}   (the server saw Cache-Control: ${seen.requestCacheControl} on that request)`);
  // Same request through node:http, with the request-side Cache-Control chosen by hand:
  const withNoCache = await get("/max-age", { "If-None-Match": tag, "Cache-Control": "no-cache" });
  const withMaxAge0 = await get("/max-age", { "If-None-Match": tag, "Cache-Control": "max-age=0" });
  console.log(`   node:http, If-None-Match + Cache-Control: no-cache    -> ${withNoCache.status}`);
  console.log(`   node:http, If-None-Match + Cache-Control: max-age=0   -> ${withMaxAge0.status}`);
  console.log("   So a request-side no-cache makes Express send the full 200 (req.fresh is false), and max-age=0 does not.");

  server.close();
}

main().catch((err) => {
  console.error("http-cache-check failed:", err);
  process.exit(1);
});
