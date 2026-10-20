// lax-post-window.js
// A cookie with NO SameSite attribute is treated as SameSite=Lax by Chromium, with
// one exception that surprises people: for a short time after the cookie is set, a
// cross-site top-level POST (an auto-submitted form) still carries it.
// This sets such a cookie, fires the attack straight away, waits about two minutes,
// and fires it again, so it tests two points (1 s and about 126 s), not the exact boundary.
//
//   node lax-post-window.js        (takes about 2 minutes; needs CHROMIUM_PATH or an installed Chromium)

const express = require("express");
const { chromium } = require("playwright-core");

const seen = [];
const bank = express();
bank.get("/set", (req, res) => {
  res.setHeader("Set-Cookie", "sid=abc123; Path=/; HttpOnly"); // note: no SameSite attribute
  res.send("ok");
});
bank.post("/echo", (req, res) => {
  seen.push(/sid=abc123/.test(req.headers.cookie || ""));
  res.send("echo");
});

const evil = express();
evil.get("/form-post", (req, res) =>
  res.send(`<form id=f method=POST action="http://localhost:${process.env.BANK_PORT}/echo"><input name=a value=1></form><script>f.submit()</script>`)
);

const listen = (app) => new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });

async function main() {
  const b = await listen(bank);
  process.env.BANK_PORT = b.address().port;
  const e = await listen(evil);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const first = await context.newPage();
  await first.goto(`http://localhost:${b.address().port}/set`);
  const t0 = Date.now();

  const attack = async (label) => {
    seen.length = 0;
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${e.address().port}/form-post`).catch(() => {}); // 127.0.0.1 is a different site from localhost
    await page.waitForTimeout(400);
    console.log(`${label} (${Math.round((Date.now() - t0) / 1000)} s after the cookie was set): the cross-site form POST carried the cookie? ${seen[0]}`);
    await page.close();
  };

  await attack("first attempt ");
  await new Promise((resolve) => setTimeout(resolve, 125000));
  await attack("second attempt");

  await browser.close();
  b.close();
  e.close();
}

main().catch((err) => {
  console.error("lax-post-window failed:", err.message.split("\n")[0]);
  process.exit(1);
});
