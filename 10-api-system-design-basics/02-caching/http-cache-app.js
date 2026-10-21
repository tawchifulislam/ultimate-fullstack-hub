// http-cache-app.js
// An Express 5 server whose routes each send a different set of HTTP caching headers, so a
// client (Node's fetch, or a real Chromium) can show what each header actually does.
//
//   node --disable-warning=ExperimentalWarning http-cache-app.js [port]      (default 4980)
//
//   GET  /blank        an HTML page (Cache-Control: no-store) for the browser lab to run fetch() from
//   GET  /max-age      Cache-Control: public, max-age=60
//   GET  /no-cache     Cache-Control: no-cache      (may be stored, must be revalidated every time)
//   GET  /no-store     Cache-Control: no-store      (must not be stored at all)
//   GET  /immutable    Cache-Control: public, max-age=31536000, immutable
//   GET  /heuristic    no Cache-Control at all, only Last-Modified (a cache may guess a freshness time)
//   GET  /report       an EXPENSIVE route (a real SQLite GROUP BY) that checks the validator BEFORE doing the work
//   POST /bump         the data changed: bumps the version that /no-cache and /report are built from
//   GET  /log          every request the server has received, and how many times each handler really ran

const express = require("express");
const { createOrigin } = require("./origin");

function createApp({ orderRows = 200_000 } = {}) {
  const app = express();
  const origin = createOrigin({ orderRows });
  const state = { version: 1, handlerRuns: {}, reportQueries: 0 };
  const log = [];
  const ran = (name) => { state.handlerRuns[name] = (state.handlerRuns[name] || 0) + 1; };

  // Record every request once its response is finished: what was asked, and what the server answered.
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (req.path === "/log") return;
      log.push({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        conditional: Boolean(req.get("if-none-match") || req.get("if-modified-since")),
        requestCacheControl: req.get("cache-control") || null,
      });
    });
    next();
  });

  app.get("/blank", (req, res) => {
    res.set("Cache-Control", "no-store").type("html").send("<!doctype html><title>cache lab</title><p>cache lab</p>");
  });

  // Express adds a weak ETag to res.json() bodies by itself, and answers 304 when If-None-Match matches.
  // The body here depends only on `version`, so it is identical until /bump is called.
  const resource = (name) => ({ resource: name, version: state.version });

  app.get("/max-age", (req, res) => {
    ran("/max-age");
    res.set("Cache-Control", "public, max-age=60").json(resource("max-age"));
  });

  app.get("/no-cache", (req, res) => {
    ran("/no-cache");
    res.set("Cache-Control", "no-cache").json(resource("no-cache"));
  });

  app.get("/no-store", (req, res) => {
    ran("/no-store");
    res.set("Cache-Control", "no-store").json(resource("no-store"));
  });

  app.get("/immutable", (req, res) => {
    ran("/immutable");
    res.set("Cache-Control", "public, max-age=31536000, immutable").json(resource("immutable"));
  });

  app.get("/heuristic", (req, res) => {
    ran("/heuristic");
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 3600 * 1000).toUTCString();
    res.set("Last-Modified", hundredDaysAgo).json(resource("heuristic")); // note: no Cache-Control
  });

  // The cheap-validator pattern. The ETag is built from the version number, so the server can
  // answer "has it changed?" WITHOUT running the expensive query. req.fresh is Express's check of
  // If-None-Match / If-Modified-Since against the ETag / Last-Modified we just set.
  app.get("/report", (req, res) => {
    ran("/report");
    res.set({ ETag: `W/"report-v${state.version}"`, "Cache-Control": "no-cache" });
    if (req.fresh) return res.status(304).end();
    state.reportQueries++; // the real work
    res.json({ version: state.version, topCustomers: origin.topCustomers() });
  });

  app.post("/bump", (req, res) => {
    state.version++;
    res.json({ version: state.version });
  });

  app.get("/log", (req, res) => res.json({ log, state }));

  return { app, state, log };
}

module.exports = { createApp };

if (require.main === module) {
  const port = process.argv[2] || 4980;
  createApp().app.listen(port, () => console.log(`http-cache-app listening on http://localhost:${port}`));
}
