// csp-lab.js
// Content-Security-Policy (CSP) is a response header that tells the browser
// which scripts it may run. It is a second line of defense: if an injection
// slips past your escaping, the browser can still refuse to run it.
//
// Every variant below serves the SAME deliberately vulnerable page (the query
// parameter x is placed in the page unescaped), with a different CSP header.
// Three payloads are tried against each in a real Chromium:
//   script   <script>window.__pwned=true</script>
//   handler  <img src=x onerror="window.__pwned=true">
//   html     <b id="inj">injected</b>   (HTML only, no script)
// The page also has its own inline script and its own external /app.js, so you
// can see what a policy costs the legitimate code too.
//
//   node csp-lab.js

const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const { chromium } = require("playwright-core");

const app = express();

const rawCsp = (value) => (req, res, next) => {
  res.setHeader("Content-Security-Policy", value);
  next();
};
const makeNonce = (req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
};

const variants = [
  ["no CSP header", []],
  ["script-src 'self' 'unsafe-inline'", [rawCsp("script-src 'self' 'unsafe-inline'")]],
  ["default-src 'self'", [rawCsp("default-src 'self'")]],
  [
    "script-src 'nonce-...' (per request)",
    [makeNonce, (req, res, next) => { res.setHeader("Content-Security-Policy", `script-src 'nonce-${res.locals.nonce}'`); next(); }],
  ],
  ["helmet() defaults", [helmet()]],
  [
    "helmet() + nonce",
    [
      makeNonce,
      helmet({
        contentSecurityPolicy: {
          directives: {
            "script-src": ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
          },
        },
      }),
    ],
  ],
];

function vulnerablePage(req, res) {
  const nonce = res.locals.nonce ? ` nonce="${res.locals.nonce}"` : "";
  res.send(`<!doctype html><html><body>
<script${nonce}>window.__legit = true;</script>
<script${nonce} src="/app.js"></script>
<div>${req.query.x ?? ""}</div>
</body></html>`); // x is NOT escaped: this is the bug the CSP has to survive
}

app.get("/app.js", (req, res) => res.type("js").send("window.__external = true;"));
variants.forEach(([, middleware], i) => app.get(`/v${i}/page`, ...middleware, vulnerablePage));

const payloads = {
  script: `<script>window.__pwned=true</script>`,
  handler: `<img src=x onerror="window.__pwned=true">`,
  html: `<b id="inj">injected</b>`,
};

async function load(browser, base, i, payload) {
  const page = await browser.newPage();
  const violations = [];
  page.on("console", (msg) => {
    if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto(`${base}/v${i}/page?x=${encodeURIComponent(payload)}`);
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    pwned: window.__pwned === true,
    legit: window.__legit === true,
    external: window.__external === true,
    injected: document.getElementById("inj") !== null,
  }));
  await page.close();
  return { ...state, violations };
}

async function main() {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

  console.log("== 1. the same injection under six different headers");
  console.log("CSP header sent                        <script>     onerror      plain <b>    own inline   own /app.js");
  const samples = {};
  for (let i = 0; i < variants.length; i++) {
    const s = await load(browser, base, i, payloads.script);
    const hd = await load(browser, base, i, payloads.handler);
    const ht = await load(browser, base, i, payloads.html);
    samples[i] = { script: s.violations, handler: hd.violations };
    const word = (ran) => (ran ? "RAN" : "blocked").padEnd(12);
    console.log(
      `${variants[i][0].padEnd(38)} ${word(s.pwned)} ${word(hd.pwned)} ${(ht.injected ? "rendered" : "missing").padEnd(12)} ${(ht.legit ? "runs" : "BLOCKED").padEnd(12)} ${ht.external ? "runs" : "BLOCKED"}`
    );
  }

  console.log("\n== 2. what Chromium logs to the console when it refuses (variant: default-src 'self')");
  // Each page load logs one message per blocked thing. The page's OWN inline script is
  // blocked too, so a page can show two messages: print each distinct one with a count.
  for (const [label, list] of [["<script> payload page", samples[2].script], ["onerror payload page ", samples[2].handler]]) {
    const counts = new Map();
    for (const m of list) {
      const key = m.slice(0, 85);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    console.log(`  ${label}: ${list.length} message(s)`);
    for (const [key, n] of counts) console.log(`      x${n}  ${key}...`);
  }

  console.log("\n== 3. the header helmet() sends by default (helmet 8.x)");
  const res = await fetch(`${base}/v4/page`);
  for (const name of [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
    "x-powered-by",
  ]) {
    console.log(`  ${name.padEnd(30)} ${res.headers.get(name) ?? "(not sent)"}`);
  }

  console.log("\n== 4. a nonce is only useful if it changes on every response");
  const nonceOf = async () => (await fetch(`${base}/v3/page`)).headers.get("content-security-policy");
  const [a, b] = [await nonceOf(), await nonceOf()];
  console.log("  request 1:", a);
  console.log("  request 2:", b);
  console.log("  different:", a !== b);

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error("csp-lab failed:", err.message.split("\n")[0]);
  process.exit(1);
});
