// express-input-limits.js
// How Express itself treats raw input BEFORE any validation of yours runs:
// body size limits, JSON strictness, content types, the query-string
// parser, and the read-only req.query. Each section starts its own tiny
// server on a random free port and talks to it with fetch().
//
//   node express-input-limits.js

const express = require("express");

function start(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, base: `http://localhost:${server.address().port}` }));
  });
}

// A handler-level error printer, so we see what body-parser reports.
const errorJson = (err, req, res, next) => res.status(err.status || 500).json({ type: err.type, status: err.status });

async function post(base, body, headers = { "Content-Type": "application/json" }) {
  const res = await fetch(base + "/echo", { method: "POST", headers, body });
  return { status: res.status, body: await res.text() };
}

async function main() {
  // ---------- 1. body size limit ----------
  console.log("== 1. JSON body size limit");
  for (const [label, limit] of [["express.json() default", undefined], ['express.json({ limit: "1kb" })', "1kb"]]) {
    const app = express();
    app.use(express.json(limit ? { limit } : {}));
    app.post("/echo", (req, res) => res.json({ keys: Object.keys(req.body || {}).length }));
    app.use(errorJson);
    const { server, base } = await start(app);
    for (const kb of [0.5, 90, 110]) {
      const payload = JSON.stringify({ blob: "x".repeat(Math.round(kb * 1024)) });
      const r = await post(base, payload);
      console.log(`${label.padEnd(34)} body ~${String(kb).padStart(3)} kB -> ${r.status} ${r.body}`);
    }
    server.close();
  }

  // ---------- 2. strict JSON, 3. content type, 4. no body ----------
  console.log("\n== 2. what express.json() does with other bodies");
  {
    const app = express();
    app.use(express.json());
    app.post("/echo", (req, res) => res.json({ bodyIs: req.body === undefined ? "undefined" : JSON.stringify(req.body) }));
    app.use(errorJson);
    const { server, base } = await start(app);
    const json = { "Content-Type": "application/json" };
    const cases = [
      ['{"a":1}  (object)', '{"a":1}', json],
      ['[1,2]  (array)', "[1,2]", json],
      ['"hello"  (top-level string)', '"hello"', json],
      ["5  (top-level number)", "5", json],
      ["null", "null", json],
      ['{"a":1} with Content-Type: text/plain', '{"a":1}', { "Content-Type": "text/plain" }],
      ["no Content-Type and no body", undefined, {}],
    ];
    for (const [label, body, headers] of cases) {
      const r = await post(base, body, headers);
      console.log(`${label.padEnd(42)} -> ${r.status} ${r.body}`);
    }
    server.close();
  }

  // ---------- 5. the query string parser ----------
  console.log("\n== 3. the query string parser (Express 5 default vs 'extended')");
  for (const mode of ["default", "extended"]) {
    const app = express();
    if (mode === "extended") app.set("query parser", "extended");
    app.get("/q", (req, res) => res.json(req.query));
    const { server, base } = await start(app);
    console.log(`-- parser: ${mode}${mode === "default" ? ` (app.get("query parser") = ${JSON.stringify(app.get("query parser"))})` : ""}`);
    for (const qs of ["tag=a&tag=b", "user[name]=ana", "filter[$ne]=x", "id[]=1&id[]=2"]) {
      const res = await fetch(`${base}/q?${qs}`);
      console.log(`   ?${qs.padEnd(18)} -> ${await res.text()}`);
    }
    server.close();
  }

  // ---------- 6. req.query is read-only ----------
  console.log("\n== 4. assigning to req.query");
  {
    const app = express();
    app.get("/sloppy", (req, res) => {
      req.query = { page: 99 }; // file is not in strict mode: what happens?
      res.json({ afterAssignment: req.query });
    });
    app.get("/strict", (req, res) => {
      "use strict";
      try {
        req.query = { page: 99 };
        res.json({ afterAssignment: req.query });
      } catch (err) {
        res.json({ threw: `${err.name}: ${err.message}` });
      }
    });
    const { server, base } = await start(app);
    console.log("sloppy-mode handler  GET /sloppy?page=1 ->", await (await fetch(base + "/sloppy?page=1")).text());
    console.log("strict-mode handler  GET /strict?page=1 ->", await (await fetch(base + "/strict?page=1")).text());
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
