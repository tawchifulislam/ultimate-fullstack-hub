// csrf-csrf-demo.js
// The maintained library route. The old `csurf` package is archived (Node's npm
// registry says so, see the notes), and `csrf-csrf` implements the signed
// double-submit cookie pattern for Express. This file runs it end to end with
// plain Node fetch (no browser), keeping the cookies by hand.
//
//   node csrf-csrf-demo.js
//
// If your app has server-side sessions, the same author's csrf-sync package
// (synchronizer token) is recommended instead; it was not run here.

const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const { doubleCsrf } = require("csrf-csrf");

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => "demo-only-secret-use-a-long-random-value-from-the-environment",
  getSessionIdentifier: (req) => req.cookies.sid || "", // the token is bound to this value
  cookieName: "csrf",
  // The library's defaults are sameSite "strict", secure true, httpOnly true. Secure is
  // switched off here only because this demo talks to http://localhost with fetch.
  cookieOptions: { secure: false },
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"], // the header ONLY, never the cookie
});

const app = express();
app.use(cookieParser());
app.get("/login", (req, res) => {
  res.cookie("sid", crypto.randomBytes(16).toString("hex"), { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true });
});
app.get("/csrf-token", (req, res) => res.json({ csrfToken: generateCsrfToken(req, res) })); // sets the cookie, returns the token
app.use(doubleCsrfProtection); // GET, HEAD and OPTIONS pass; everything after this is protected
app.get("/safe-read", (req, res) => res.json({ read: "ok" }));
app.post("/transfer", (req, res) => res.json({ transferred: true }));
app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ error: err.message })); // JSON instead of an HTML stack trace

// ---- a tiny cookie jar around fetch ----
function client(base) {
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  async function call(path, { method = "GET", headers = {} } = {}) {
    const res = await fetch(base + path, { method, headers: { cookie: cookieHeader(), ...headers } });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return { status: res.status, body: await res.json() };
  }
  return { call, jar };
}

async function main() {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;
  const show = (label, r) => console.log(`${label.padEnd(58)} -> ${r.status} ${JSON.stringify(r.body)}`);

  const nadia = client(base);
  await nadia.call("/login");
  const { body } = await nadia.call("/csrf-token");
  console.log(`token from /csrf-token: ${body.csrfToken.slice(0, 24)}...  (cookies now held: ${[...nadia.jar.keys()].join(", ")})\n`);

  show("GET /safe-read (GET is not protected)", await nadia.call("/safe-read"));
  show("POST /transfer, cookie but NO token header", await nadia.call("/transfer", { method: "POST" }));
  show("POST /transfer, cookie and a made-up token header", await nadia.call("/transfer", { method: "POST", headers: { "x-csrf-token": "not-a-real-token" } }));
  show("POST /transfer, cookie and the right token header", await nadia.call("/transfer", { method: "POST", headers: { "x-csrf-token": body.csrfToken } }));

  // A token issued for one session must not work for another one.
  const omar = client(base);
  await omar.call("/login");
  const omarToken = (await omar.call("/csrf-token")).body.csrfToken;
  const swapped = client(base);
  await swapped.call("/login"); // a third session
  swapped.jar.set("csrf", nadia.jar.get("csrf")); // ...carrying nadia's csrf cookie
  show("POST /transfer, nadia's cookie and token on ANOTHER session", await swapped.call("/transfer", { method: "POST", headers: { "x-csrf-token": body.csrfToken } }));
  show("POST /transfer, omar's token with nadia's cookies", await nadia.call("/transfer", { method: "POST", headers: { "x-csrf-token": omarToken } }));

  server.close();
}

main().catch((err) => {
  console.error("csrf-csrf-demo failed:", err.message);
  process.exit(1);
});
