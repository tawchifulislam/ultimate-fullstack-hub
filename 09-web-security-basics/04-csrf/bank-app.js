// bank-app.js
// The TARGET of the CSRF attacks in this topic: a tiny bank. Run it only on your own machine.
//
//   node bank-app.js [port]                       (default 4960)
//   SAMESITE=lax PROTECTION=token node bank-app.js
//
// createBank(options) builds one bank. Every option is a switch the lab flips:
//
//   sameSite          "unset" | "none" | "lax" | "strict"      what the session cookie says
//   protection        "none" | "token" | "double-submit" | "origin" | "custom-header"
//   allowGetTransfer  true adds GET /transfer, a state-changing GET (a classic mistake)
//   jsonAnyContentType true makes express.json() parse JSON whatever the Content-Type says
//   corsReflect       true answers every Origin with "yes, and with credentials" (Topic 82's bad config)
//
// Routes:
//   GET  /login?user=nadia     demo shortcut: starts a session (a real app checks a password, Topic 84)
//   GET  /account              balance, a transfer form, and a script the bank's own page uses
//   POST /transfer             form-encoded transfer, cookie-authenticated
//   POST /api/transfer         JSON transfer, cookie-authenticated
//   GET  /transfer             state-changing GET, only when allowGetTransfer is on
//   GET  /api/bearer/token     hands the logged-in page a token to keep in memory
//   POST /api/bearer/transfer  JSON transfer, authenticated by an Authorization header, NOT a cookie
//   GET  /search?q=            reflected XSS on purpose (Topic 85), used to show tokens do not survive XSS

const express = require("express");
const { newToken, safeEqual, makeDoubleSubmit, verifyDoubleSubmit } = require("./csrf-token");

const SECRET = "demo-only-secret"; // signs double-submit tokens. Load a real one from the environment (Topic 79).
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function createBank(options = {}) {
  const {
    sameSite = "lax",
    protection = "none",
    allowGetTransfer = false,
    jsonAnyContentType = false,
    corsReflect = false,
    allowedOrigins = [],
  } = options;

  const app = express();
  const sessions = new Map(); // sid -> { sid, user, csrf }
  const bearerTokens = new Map(); // token -> user
  const log = []; // one entry per request the bank received, so a lab can see exactly what arrived
  let balances;
  let transfers;
  const reset = () => {
    balances = { nadia: 1000, omar: 200, mallory: 0 };
    transfers = [];
    log.length = 0;
  };
  reset();

  const cookieTail = { unset: "", none: "; SameSite=None; Secure", lax: "; SameSite=Lax", strict: "; SameSite=Strict" }[sameSite];
  const readCookie = (req, name) => (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];

  // ---- record every request ----
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (req.path === "/favicon.ico") return;
      log.push({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        cookie: readCookie(req, "sid") !== undefined,
        auth: Boolean(req.headers.authorization),
        origin: req.headers.origin || "-",
        site: req.headers["sec-fetch-site"] || "-",
        reason: res.locals.reason || "",
      });
    });
    next();
  });

  // ---- the dangerous CORS configuration, when asked for ----
  if (corsReflect) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (!origin) return next();
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "");
        return res.status(204).end();
      }
      next();
    });
  }

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json(jsonAnyContentType ? { type: () => true } : {}));

  // ---- sessions ----
  app.use((req, res, next) => {
    req.session = sessions.get(readCookie(req, "sid")) || null;
    next();
  });
  const requireLogin = (req, res, next) => (req.session ? next() : res.status(401).json({ error: "not logged in" }));

  // ---- the CSRF check, applied only to state-changing methods ----
  function checkRequest(req) {
    if (protection === "token") {
      const sent = req.headers["x-csrf-token"] || req.body?._csrf;
      if (!sent) return "no token sent";
      if (!safeEqual(sent, req.session.csrf)) return "token does not match the session";
    } else if (protection === "double-submit") {
      const sent = req.headers["x-csrf-token"] || req.body?._csrf;
      if (!sent) return "no token sent";
      if (!verifyDoubleSubmit(SECRET, req.session.sid, readCookie(req, "csrf"), sent)) return "token not valid for this session";
    } else if (protection === "origin") {
      // Origin is the precise signal. Sec-Fetch-Site is the fallback. Neither present: fail closed.
      // (A production check would compare against a configured list, not the Host header.)
      const allowed = new Set([`http://${req.headers.host}`, ...allowedOrigins]);
      const origin = req.headers.origin;
      const site = req.headers["sec-fetch-site"];
      if (origin) {
        if (!allowed.has(origin)) return `Origin ${origin} is not allowed`;
      } else if (site) {
        if (site !== "same-origin" && site !== "none") return `Sec-Fetch-Site is ${site}`;
      } else {
        return "no Origin and no Sec-Fetch-Site";
      }
    } else if (protection === "custom-header") {
      if (req.headers["x-requested-with"] !== "bank-ui") return "custom header missing";
    }
    return null;
  }
  function guard(req, res, next) {
    if (protection === "none" || !UNSAFE.has(req.method)) return next();
    const reason = checkRequest(req);
    if (!reason) return next();
    res.locals.reason = reason;
    res.status(403).json({ error: `csrf check failed: ${reason}` });
  }

  function doTransfer(from, to, amount, via) {
    amount = Number(amount);
    if (!(amount > 0) || typeof to !== "string" || !Object.hasOwn(balances, to) || balances[from] < amount) return null;
    balances[from] -= amount;
    balances[to] += amount;
    const entry = { from, to, amount, via };
    transfers.push(entry);
    return entry;
  }

  // ---- routes ----
  app.get("/login", (req, res) => {
    const user = Object.hasOwn(balances, req.query.user) ? req.query.user : "nadia";
    const sid = newToken();
    sessions.set(sid, { sid, user, csrf: newToken() });
    res.setHeader("Set-Cookie", `sid=${sid}; Path=/; HttpOnly${cookieTail}`);
    res.redirect("/account");
  });

  app.get("/account", requireLogin, (req, res) => {
    let token = "";
    if (protection === "token") token = req.session.csrf;
    if (protection === "double-submit") {
      token = makeDoubleSubmit(SECRET, req.session.sid);
      res.setHeader("Set-Cookie", `csrf=${token}; Path=/${cookieTail}`); // readable on purpose: the page must send it back
    }
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Bank</title>
<meta name="csrf-token" content="${token}"></head><body>
<h1>Bank</h1><p>Logged in as <b>${req.session.user}</b>. Balance: <span id="balance">${balances[req.session.user]}</span></p>
<form method="POST" action="/transfer">
  <input name="to" value="omar"><input name="amount" value="10">
  ${token ? `<input type="hidden" name="_csrf" value="${token}">` : ""}
  <button type="submit">Send</button>
</form>
<script>
  const csrf = document.querySelector('meta[name=csrf-token]').content;
  async function sendWithFetch(to, amount) {
    const headers = { "Content-Type": "application/json", "X-Requested-With": "bank-ui" };
    if (csrf) headers["X-CSRF-Token"] = csrf;
    return (await fetch("/api/transfer", { method: "POST", headers, body: JSON.stringify({ to, amount }) })).status;
  }
  let bearer = null;
  async function sendBearer(to, amount) {
    if (!bearer) bearer = (await (await fetch("/api/bearer/token")).json()).token; // kept in memory, never in a cookie
    const headers = { "Content-Type": "application/json", Authorization: "Bearer " + bearer };
    return (await fetch("/api/bearer/transfer", { method: "POST", headers, body: JSON.stringify({ to, amount }) })).status;
  }
</script></body></html>`);
  });

  app.post("/transfer", requireLogin, guard, (req, res) => {
    const t = doTransfer(req.session.user, req.body?.to, req.body?.amount, "POST /transfer");
    t ? res.send(`<p>Sent ${t.amount} to ${t.to}.</p>`) : res.status(400).send("<p>Transfer failed.</p>");
  });

  app.post("/api/transfer", requireLogin, guard, (req, res) => {
    const t = doTransfer(req.session.user, req.body?.to, req.body?.amount, "POST /api/transfer");
    t ? res.json({ ok: true }) : res.status(400).json({ error: "bad transfer" });
  });

  if (allowGetTransfer) {
    app.get("/transfer", requireLogin, (req, res) => {
      const t = doTransfer(req.session.user, req.query.to, req.query.amount, "GET /transfer");
      t ? res.send(`<p>Sent ${t.amount} to ${t.to}.</p>`) : res.status(400).send("<p>Transfer failed.</p>");
    });
  }

  app.get("/api/bearer/token", requireLogin, (req, res) => {
    const token = newToken();
    bearerTokens.set(token, req.session.user);
    res.json({ token });
  });

  app.post("/api/bearer/transfer", (req, res) => {
    const user = bearerTokens.get((req.headers.authorization || "").replace(/^Bearer /, ""));
    if (!user) return res.status(401).json({ error: "no valid Authorization header" });
    const t = doTransfer(user, req.body?.to, req.body?.amount, "POST /api/bearer/transfer");
    t ? res.json({ ok: true }) : res.status(400).json({ error: "bad transfer" });
  });

  app.get("/search", (req, res) => {
    res.send(`<!doctype html><html><body><h1>Search</h1><p>You searched for: ${req.query.q || ""}</p></body></html>`); // UNESCAPED (Topic 85)
  });

  return { app, log, reset, state: () => ({ balances: { ...balances }, transfers: [...transfers] }) };
}

module.exports = { createBank };

if (require.main === module) {
  const port = process.argv[2] || 4960;
  const options = {
    sameSite: process.env.SAMESITE || "lax",
    protection: process.env.PROTECTION || "none",
    allowGetTransfer: process.env.GET_TRANSFER === "1",
    jsonAnyContentType: process.env.JSON_ANY === "1",
    corsReflect: process.env.CORS_REFLECT === "1",
  };
  createBank(options).app.listen(port, () => console.log(`bank listening on http://localhost:${port}`, options));
}
