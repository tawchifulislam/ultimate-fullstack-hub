// leak-demo.js
// The most dangerous caching bug: a response that depends on WHO is asking, cached under a key
// that does not include who is asking. The next person to ask for the same URL is handed the
// first person's data, and if the cache sits in front of the login check they do not even need to
// be logged in.
//
// The "login" here is a stand-in: an X-User header that names the user (a real app would use a
// session cookie or a token, Topics 81 and 86). The caching bug is the same either way.
//
//   node --disable-warning=ExperimentalWarning leak-demo.js

const express = require("express");
const { TTLCache } = require("./ttl-cache");
const { responseCache } = require("./response-cache");

const USERS = {
  alice: { user: "alice", email: "alice@example.com", balance: 4200 },
  bob: { user: "bob", email: "bob@example.com", balance: 17 },
};

function createApp(variant) {
  const app = express();
  const cache = new TTLCache({ ttlMs: 60_000 });
  const stats = { handlerRuns: 0 };

  const authenticate = (req, res, next) => {
    const user = USERS[req.get("x-user")];
    if (!user) return res.status(401).json({ error: "log in first" });
    req.user = user;
    next();
  };
  const me = (req, res) => {
    stats.handlerRuns++;
    res.json(req.user);
  };

  if (variant === "buggy") {
    // BUG 1: the key is the URL only, so every user shares one entry.
    // BUG 2: the cache runs BEFORE authenticate, so a hit never reaches the login check.
    app.use(responseCache({ cache, key: (req) => req.originalUrl }));
    app.get("/me", authenticate, me);
  } else {
    // FIX: log in first, then put the user into the key.
    app.get("/me", authenticate, responseCache({ cache, key: (req) => `${req.user.user}|${req.originalUrl}` }), me);
  }
  return { app, stats };
}

async function main() {
  for (const variant of ["buggy", "fixed"]) {
    const { app, stats } = createApp(variant);
    const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    const base = `http://localhost:${server.address().port}`;

    console.log(`== ${variant === "buggy" ? "1. cache keyed by URL only, placed before the login check" : "2. login first, the user is part of the cache key"}`);
    const asks = [
      ["alice asks for /me ", { "X-User": "alice" }],
      ["bob asks for /me   ", { "X-User": "bob" }],
      ["nobody (no login)  ", {}],
      ["alice asks again   ", { "X-User": "alice" }],
    ];
    for (const [who, headers] of asks) {
      const res = await fetch(`${base}/me`, { headers });
      const body = await res.json();
      console.log(`   ${who} -> ${res.status}  X-Cache: ${(res.headers.get("x-cache") ?? "-").padEnd(4)} ${JSON.stringify(body)}`);
    }
    console.log(`   handler ran ${stats.handlerRuns} time(s)\n`);
    server.close();
  }
}

main().catch((err) => {
  console.error("leak-demo failed:", err);
  process.exit(1);
});
