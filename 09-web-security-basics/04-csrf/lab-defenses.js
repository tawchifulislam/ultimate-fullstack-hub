// lab-defenses.js
// Four server-side CSRF defenses, each tested two ways in a real Chromium:
//   - does the bank's OWN page still work? (a legitimate form submit, and a legitimate fetch)
//   - does each evil request fail?
// To make the defense do the work, the session cookie is SameSite=None; Secure, the
// weakest setting: the cookie goes along with every cross-site request, so only the
// defense under test stands in the way.
//
// Then: three ways the defenses are defeated (XSS, a permissive CORS setup), and why
// a header-based login (Authorization: Bearer) has no CSRF problem to begin with.
//
//   node lab-defenses.js        (needs a Chromium: set CHROMIUM_PATH, or npx playwright-core install chromium)

const { createEvilSite } = require("./attacker-site");
const { listen, launch, startBank, loginVictim, attack, outcome } = require("./lab-common");

const protections = ["none", "token", "double-submit", "origin", "custom-header"];

async function legitUse(victim, bank, port) {
  const page = victim.page;
  await page.goto(`http://localhost:${port}/account`);
  bank.reset();
  await page.fill("input[name=to]", "omar");
  await page.click("button[type=submit]");
  await page.waitForLoadState();
  const formWorked = bank.state().transfers.some((t) => t.via === "POST /transfer");
  await page.goto(`http://localhost:${port}/account`);
  bank.reset();
  const status = await page.evaluate(() => sendWithFetch("omar", 10));
  return { form: formWorked ? "works" : "FAILS", fetch: status === 200 ? "works" : `FAILS (${status})` };
}

async function main() {
  const evilSite = createEvilSite();
  const evil = await listen(evilSite.app);
  const browser = await launch();
  console.log(`Chromium ${browser.version()}. Cookie: SameSite=None; Secure. A state-changing GET /transfer exists, on purpose (the last column).\n`);

  console.log("== 1. each defense: does legitimate use work, and does each attack stop?");
  console.log("                  --- bank's own page ---   ------------------------ evil site ------------------------");
  console.log("protection        form      fetch           form       form        fetch      fetch+hdr   image GET");
  console.log("                                            x-site     same-site   x-site     x-site      x-site");
  const reasons = {};
  for (const protection of protections) {
    const { bank, port } = await startBank({ sameSite: "none", protection, allowGetTransfer: true, jsonAnyContentType: true });
    const victim = await loginVictim(browser, port);
    const legit = await legitUse(victim, bank, port);
    const run = (host, pagePath) => attack(victim, bank, evil.port, host, pagePath, { bank: port });
    const a1 = await run("127.0.0.1", "form-post");
    const a2 = await run("localhost", "form-post");
    const a3 = await run("127.0.0.1", "fetch-simple");
    const a4 = await run("127.0.0.1", "fetch-json");
    const a5 = await run("127.0.0.1", "img-get");
    reasons[protection] = { crossSite: a1.reason, sameSite: a2.reason, fetch: a3.reason };
    const cell = (r, w) => (r.moved ? "MOVED" : "blocked").padEnd(w);
    console.log(
      `${protection.padEnd(17)} ${legit.form.padEnd(9)} ${legit.fetch.padEnd(15)} ${cell(a1, 10)} ${cell(a2, 11)} ${cell(a3, 10)} ${cell(a4, 11)} ${cell(a5, 9)}`
    );
    await victim.context.close();
  }

  console.log("\nwhy each request was refused (the bank's own reason, from the 403 it sent):");
  for (const protection of protections.slice(1)) {
    const r = reasons[protection];
    console.log(`  ${protection.padEnd(14)} x-site form: ${r.crossSite || "(not a 403)"}`);
    console.log(`  ${"".padEnd(14)} same-site form: ${r.sameSite || "(not a 403)"}`);
    console.log(`  ${"".padEnd(14)} fetch text/plain: ${r.fetch || "(not a 403)"}`);
  }

  console.log("\n== 2. ways a CSRF token is defeated anyway");

  // 2a. XSS: the injected script runs on the bank's own origin, so it can read the token like the page does.
  {
    const { bank, port } = await startBank({ sameSite: "strict", protection: "token" });
    const victim = await loginVictim(browser, port);
    bank.reset();
    // The payload sits inside onerror="...", so it must not contain a double quote.
    const js =
      "fetch('/account').then(function(r){return r.text()}).then(function(h){" +
      "var t=new DOMParser().parseFromString(h,'text/html').querySelector('meta[name=csrf-token]').content;" +
      "return fetch('/api/transfer',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'bank-ui','X-CSRF-Token':t},body:JSON.stringify({to:'mallory',amount:100})})})";
    const page = await victim.context.newPage();
    await page.goto(`http://localhost:${port}/search?q=${encodeURIComponent(`<img src=x onerror="${js}">`)}`);
    await page.waitForTimeout(600);
    await page.close();
    const xss = outcome(bank);
    const control = await attack(victim, bank, evil.port, "127.0.0.1", "form-post", { bank: port });
    console.log(`a) token + SameSite=Strict + an XSS hole (Topic 85):   injected script -> ${xss.text}`);
    console.log(`   (control, same bank, cross-site form POST:           ${control.text})`);
    await victim.context.close();
  }

  // 2b. CORS: if the bank lets any origin READ its pages with credentials, the evil page reads the token too.
  for (const corsReflect of [false, true]) {
    const { bank, port } = await startBank({ sameSite: "none", protection: "token", corsReflect });
    const victim = await loginVictim(browser, port);
    evilSite.reports.length = 0;
    const result = await attack(victim, bank, evil.port, "127.0.0.1", "token-reader", { bank: port });
    const read = evilSite.reports.find((r) => r.step === "read") || {};
    const getPage = bank.log.find((r) => r.method === "GET" && r.path === "/account");
    console.log(
      `b) token + bank reflects Origin with credentials = ${String(corsReflect).padEnd(5)}:  evil page could read the bank's page: ${read.readable || "?"}` +
        `${read.gotToken ? `, got a token: ${read.gotToken}` : ""} -> ${result.moved ? "MONEY MOVED" : "no money moved"}` +
        `   (the bank answered the GET with ${getPage ? getPage.status : "nothing"}, cookie sent: ${getPage ? getPage.cookie : "n/a"})`
    );
    await victim.context.close();
  }

  console.log("\n== 3. login by Authorization header instead of a cookie");
  {
    const { bank, port } = await startBank({ sameSite: "none", protection: "none", jsonAnyContentType: true });
    const victim = await loginVictim(browser, port);
    await victim.page.goto(`http://localhost:${port}/account`);
    bank.reset();
    const status = await victim.page.evaluate(() => sendBearer("omar", 10));
    console.log(`bank's own page, token kept in memory:        status ${status}, ledger: ${JSON.stringify(bank.state().transfers.map((t) => t.via))}`);

    const viaCookie = await attack(victim, bank, evil.port, "127.0.0.1", "fetch-simple", { bank: port, path: "/api/transfer" });
    console.log(`evil fetch to the cookie-authenticated API:   ${viaCookie.text}`);

    const viaBearer = await attack(victim, bank, evil.port, "127.0.0.1", "fetch-simple", { bank: port, path: "/api/bearer/transfer" });
    const seen = bank.log.filter((r) => r.path === "/api/bearer/transfer").at(-1);
    console.log(`evil fetch to the Bearer-authenticated API:   ${viaBearer.text}; the request carried the session cookie: ${seen.cookie}, an Authorization header: ${seen.auth}`);
    await victim.context.close();
  }

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("lab-defenses failed:", err.message.split("\n")[0]);
  process.exit(1);
});
