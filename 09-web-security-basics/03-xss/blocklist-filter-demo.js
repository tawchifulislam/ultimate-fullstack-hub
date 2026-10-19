// blocklist-filter-demo.js
// The most common wrong fix for XSS: "remove the dangerous parts from the input".
// A filter that deletes <script> tags looks like it works on the one payload the
// developer tried. This sends four payloads through such a filter, and through
// proper output escaping, and checks in a real Chromium which ones run.
//
//   node blocklist-filter-demo.js

const express = require("express");
const { chromium } = require("playwright-core");

// The naive filter: delete anything that looks like a <script>...</script> block.
const naiveFilter = (s) => String(s).replace(/<script.*?>.*?<\/script>/gi, "");

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const wrap = (body) => `<!doctype html><html><body><div>${body}</div></body></html>`;
const app = express();
app.get("/filtered", (req, res) => res.send(wrap(naiveFilter(req.query.x))));
app.get("/escaped", (req, res) => res.send(wrap(escapeHtml(req.query.x))));

const payloads = [
  ["plain <script>", `<script>window.__pwned=true</script>`],
  ["<img onerror>", `<img src=x onerror="window.__pwned=true">`],
  ["<svg onload>", `<svg onload="window.__pwned=true"></svg>`],
  // The filter deletes the inner <script></script> pairs, and what is left
  // glues itself back together into a working <script> block.
  ["nested tags", `<scr<script></script>ipt>window.__pwned=true</scr<script></script>ipt>`],
];

async function ran(browser, base, route, payload) {
  const page = await browser.newPage();
  await page.goto(`${base}${route}?x=${encodeURIComponent(payload)}`);
  await page.waitForTimeout(250);
  const result = await page.evaluate(() => window.__pwned === true);
  await page.close();
  return result;
}

async function main() {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

  console.log("payload            after the naive filter                                   filter     escaping");
  for (const [label, payload] of payloads) {
    const f = await ran(browser, base, "/filtered", payload);
    const e = await ran(browser, base, "/escaped", payload);
    console.log(`${label.padEnd(18)} ${JSON.stringify(naiveFilter(payload)).slice(0, 55).padEnd(56)} ${(f ? "RAN" : "did not run").padEnd(10)} ${e ? "RAN" : "did not run"}`);
  }

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error("blocklist-filter-demo failed:", err.message.split("\n")[0]);
  process.exit(1);
});
