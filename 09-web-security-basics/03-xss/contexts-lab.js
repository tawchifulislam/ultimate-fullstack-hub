// contexts-lab.js
// Output escaping depends on WHERE the value lands in the page. A function
// that escapes & < > " ' (escapeHtml below) is right for some places and
// wrong for others. For each place this starts a tiny server, loads the page
// in a real Chromium with an attacker string, and checks whether it ran.
//
//   node contexts-lab.js

const express = require("express");
const { chromium } = require("playwright-core");

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Only allow links that stay links: http, https, mailto. Anything else becomes "#".
function safeUrl(input) {
  try {
    const url = new URL(String(input), "http://placeholder.invalid");
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? String(input) : "#";
  } catch {
    return "#";
  }
}

// JSON that is safe to place inside a <script> element.
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

const wrap = (body) => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;

const app = express();
app.get("/body", (req, res) => res.send(wrap(`<p>${escapeHtml(req.query.x)}</p>`)));
app.get("/attr-quoted", (req, res) => res.send(wrap(`<input id="f" value="${escapeHtml(req.query.x)}">`)));
app.get("/attr-unquoted", (req, res) => res.send(wrap(`<input id="f" value=${escapeHtml(req.query.x)}>`)));
app.get("/href", (req, res) => res.send(wrap(`<a id="link" href="${escapeHtml(req.query.x)}">go</a>`)));
app.get("/href-fixed", (req, res) => res.send(wrap(`<a id="link" href="${escapeHtml(safeUrl(req.query.x))}">go</a>`)));
app.get("/script", (req, res) => res.send(wrap(`<script>var data = ${JSON.stringify({ name: req.query.x })};</script>`)));
app.get("/script-fixed", (req, res) => res.send(wrap(`<script>var data = ${jsonForScript({ name: req.query.x })};</script>`)));

const MARK = "window.__pwned=true";
const rows = [
  ["HTML text", "/body", `<img src=x onerror=${MARK}>`, "escapeHtml", null],
  ["attribute, QUOTED", "/attr-quoted", `" onfocus="${MARK}" autofocus="`, "escapeHtml", null],
  ["attribute, UNQUOTED", "/attr-unquoted", `x onfocus=${MARK} autofocus`, "escapeHtml", "/attr-quoted"],
  ["URL in href", "/href", `javascript:${MARK}`, "escapeHtml", "/href-fixed"],
  ["JSON inside <script>", "/script", `</script><script>${MARK}</script>`, "JSON.stringify", "/script-fixed"],
];

// click = true clicks the link (needed to trigger a javascript: URL). The href is
// read BEFORE the click, because a click on a real link navigates away.
async function ran(browser, base, route, payload, click = false) {
  const page = await browser.newPage();
  await page.goto(`${base}${route}?x=${encodeURIComponent(payload)}`);
  const isLink = route.startsWith("/href");
  const link = isLink ? await page.evaluate(() => document.getElementById("link").getAttribute("href")) : null;
  if (isLink && click) await page.click("#link").catch(() => {});
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => window.__pwned === true).catch(() => false);
  await page.close();
  return { ran: result, link };
}

async function main() {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

  console.log("context                 escaping used     did the payload run?      correct handling                         payload run?");
  for (const [context, route, payload, used, fixRoute] of rows) {
    const a = await ran(browser, base, route, payload, true);
    let fixText = "(already correct)";
    let fixRan = "";
    if (fixRoute) {
      const b = await ran(browser, base, fixRoute, payload, true);
      fixText = fixRoute === "/attr-quoted" ? "always quote the attribute value" : fixRoute === "/href-fixed" ? "allowlist http, https, mailto" : "escape < as \\u003c in the JSON";
      fixRan = b.ran ? "RAN" : "did not run";
    }
    console.log(`${context.padEnd(23)} ${used.padEnd(17)} ${(a.ran ? "RAN" : "did not run").padEnd(25)} ${fixText.padEnd(40)} ${fixRan}`);
  }

  // The fix must not break legitimate input.
  console.log("\nlegitimate links through the fixed handler:");
  for (const url of ["https://example.com/?a=1&b=2", "mailto:nadia@example.com", "/relative/path", "javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,hi"]) {
    const r = await ran(browser, base, "/href-fixed", url, false); // read only, do not navigate
    console.log(`  ${JSON.stringify(url).padEnd(34)} -> href=${JSON.stringify(r.link)}`);
  }

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error("contexts-lab failed:", err.message.split("\n")[0]);
  process.exit(1);
});
