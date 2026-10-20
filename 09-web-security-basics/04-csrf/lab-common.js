// lab-common.js
// Shared plumbing for lab-attacks.js and lab-defenses.js: start servers on free
// ports, log a victim in to the bank in a real Chromium, open an evil page in the
// SAME browser (so the victim's cookies are there), and report what reached the bank.

const { chromium } = require("playwright-core");
const { createBank } = require("./bank-app");

const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });

const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

async function startBank(options) {
  const bank = createBank(options);
  const { server, port } = await listen(bank.app);
  return { bank, server, port };
}

// A fresh browser (cookie jar) with nadia logged in to the bank.
async function loginVictim(browser, bankPort) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://localhost:${bankPort}/login?user=nadia`); // redirects to /account
  return { context, page };
}

// What did the bank see? "moved" is the ground truth (the bank's own ledger).
function outcome(bank) {
  if (bank.state().transfers.length) return { moved: true, short: "MOVED", text: "MONEY MOVED" };
  const requests = bank.log;
  if (!requests.length) return { moved: false, short: "none", text: "nothing reached the bank" };
  if (requests.every((r) => r.method === "OPTIONS")) return { moved: false, short: "preflight", text: "stopped at the preflight" };
  const r = requests.filter((x) => x.method !== "OPTIONS").at(-1);
  const why = r.reason ? `: ${r.reason}` : "";
  return r.cookie
    ? { moved: false, short: String(r.status), text: `blocked (${r.status}${why})`, reason: r.reason }
    : { moved: false, short: "no cookie", text: `no cookie sent (${r.status})` };
}

// Open one evil page in the victim's browser, wait, and report the outcome.
async function attack(victim, bank, evilPort, host, pagePath, params) {
  bank.reset();
  const page = await victim.context.newPage();
  const query = new URLSearchParams(params).toString();
  await page.goto(`http://${host}:${evilPort}/${pagePath}?${query}`).catch(() => {}); // pages that navigate away interrupt goto
  await page.waitForTimeout(600);
  await page.close();
  return outcome(bank);
}

module.exports = { listen, launch, startBank, loginVictim, outcome, attack };
