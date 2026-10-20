// lab-attacks.js
// A victim is logged in to the bank in a real Chromium. An evil page then tries
// five kinds of cross-site request, against a bank with NO CSRF protection of its
// own, once for each way the session cookie can be set. The only thing that varies
// is the cookie's SameSite attribute, so this isolates what SameSite does.
//
// The evil page is served two ways:
//   127.0.0.1:PORT   a different SITE from the bank (localhost)            "cross-site"
//   localhost:PORT   a different ORIGIN (other port) but the same SITE     "same-site"
//
//   node lab-attacks.js        (needs a Chromium: set CHROMIUM_PATH, or npx playwright-core install chromium)

const { createEvilSite } = require("./attacker-site");
const { listen, launch, startBank, loginVictim, attack } = require("./lab-common");

const settings = [
  ["unset", "no SameSite attribute"],
  ["none", "SameSite=None; Secure"],
  ["lax", "SameSite=Lax"],
  ["strict", "SameSite=Strict"],
];
const attacks = [
  ["form POST (auto-submitted)", "form-post"],
  ["image GET", "img-get"],
  ["redirect to a GET URL", "nav-get"],
  ["fetch, text/plain body", "fetch-simple"],
  ["fetch, JSON + custom header", "fetch-json"],
];

async function main() {
  const evil = await listen(createEvilSite().app);
  const browser = await launch();
  console.log(`Chromium ${browser.version()}. Bank: http://localhost:PORT. Victim: nadia (balance 1000). Attack: send 100 to mallory.\n`);

  console.log("== 1. five attacks against a bank with no CSRF protection, for each cookie setting");
  for (const [sameSite, label] of settings) {
    const { bank, port } = await startBank({ sameSite, protection: "none", allowGetTransfer: true, jsonAnyContentType: true });
    const probe = await loginVictim(browser, port);
    const jar = (await probe.context.cookies()).find((c) => c.name === "sid");
    await probe.context.close();
    console.log(`\nsession cookie sent as: ${label}   (Chromium stored it as SameSite=${jar ? jar.sameSite : "(rejected)"})`);
    console.log("attack                         evil on 127.0.0.1 (cross-site)        evil on localhost (same-site, other port)");
    for (const [name, pagePath] of attacks) {
      const cells = [];
      for (const host of ["127.0.0.1", "localhost"]) {
        const victim = await loginVictim(browser, port); // a fresh browser each time, so cookie age is the same for every attack
        const result = await attack(victim, bank, evil.port, host, pagePath, { bank: port });
        await victim.context.close();
        cells.push(result.text);
      }
      console.log(`${name.padEnd(30)} ${cells[0].padEnd(37)} ${cells[1]}`);
    }
  }

  console.log("\n== 2. the JSON-parsing accident: same fetch(text/plain) attack, cookie SameSite=None; Secure");
  for (const [jsonAnyContentType, label] of [
    [false, "express.json() left at its default       "],
    [true, "express.json({ type: () => true })        "],
  ]) {
    const { bank, port } = await startBank({ sameSite: "none", jsonAnyContentType });
    const victim = await loginVictim(browser, port);
    const result = await attack(victim, bank, evil.port, "127.0.0.1", "fetch-simple", { bank: port });
    console.log(`${label} -> ${result.text}`);
    await victim.context.close();
  }

  // What can the bank SEE about a cross-site request? This is what the Origin and
  // Fetch Metadata defenses in lab-defenses.js work from.
  console.log("\n== 3. the headers the bank receives (cookie SameSite=None; Secure, so every request arrives)");
  console.log("attack                         evil site    requests the bank received");
  {
    const { bank, port } = await startBank({ sameSite: "none", jsonAnyContentType: true, allowGetTransfer: true });
    for (const [name, pagePath] of attacks) {
      for (const [host, where] of [["127.0.0.1", "cross-site"], ["localhost", "same-site "]]) {
        const victim = await loginVictim(browser, port);
        await attack(victim, bank, evil.port, host, pagePath, { bank: port });
        const seen = bank.log.map((r) => `${r.method} Origin=${r.origin.replace(/:\d+$/, ":PORT")} Sec-Fetch-Site=${r.site}`);
        console.log(`${name.padEnd(30)} ${where}   ${seen.join("  then  ")}`);
        await victim.context.close();
      }
    }
  }

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("lab-attacks failed:", err.message.split("\n")[0]);
  process.exit(1);
});
