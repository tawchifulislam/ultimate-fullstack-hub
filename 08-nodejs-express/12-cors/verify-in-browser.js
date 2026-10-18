// verify-in-browser.js
// Opens the demo page in a real Chromium, runs every scenario, and prints:
//   - what the PAGE saw for each one (worked, or a generic TypeError)
//   - the CORS explanations the browser itself wrote to its console
//
//   node verify-in-browser.js <apiBase> <pageOrigin>
//   node verify-in-browser.js http://localhost:4700 http://localhost:5000
//
// Needs `npm install` (playwright-core) and a Chromium. Either run
// `npx playwright install chromium`, or point CHROMIUM_PATH at a Chrome or
// Chromium binary you already have. The API server and page-server.js must
// already be running.

const { chromium } = require("playwright-core");

const apiBase = process.argv[2] || "http://localhost:4700";
const pageOrigin = process.argv[3] || "http://localhost:5000";

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage(); // a fresh profile every run: no leftover cookies

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`${pageOrigin}/?api=${encodeURIComponent(apiBase)}`);
  const results = await page.evaluate(() => window.runAll());

  console.log(`page origin: ${pageOrigin}`);
  console.log(`api:         ${apiBase}\n`);
  for (const r of results) {
    const outcome = r.ok ? `WORKED (${r.status}) ${JSON.stringify(r.body)}` : `BLOCKED  ${r.error}`;
    console.log(`${r.name}\n    ${outcome}`);
  }

  // Chromium also logs a generic "Failed to load resource" line next to each
  // real error (and one for the page's missing favicon). Those carry no
  // explanation, so they are counted instead of printed.
  const generic = consoleErrors.filter((t) => t.startsWith("Failed to load resource"));
  const explained = consoleErrors.filter((t) => !t.startsWith("Failed to load resource"));

  console.log(`\nbrowser console errors with an explanation (${explained.length}):`);
  for (const text of explained) {
    console.log("  - " + text.replace(/\s+/g, " ").slice(0, 400));
  }
  console.log(`(${generic.length} generic "Failed to load resource" lines omitted)`);

  await browser.close();
}

main().catch((err) => {
  console.error("verify-in-browser failed:", err.message.split("\n")[0]);
  process.exit(1);
});
