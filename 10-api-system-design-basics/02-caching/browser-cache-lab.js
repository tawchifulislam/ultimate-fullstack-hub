// browser-cache-lab.js
// What a real browser does with the caching headers. A real Chromium opens a page from
// http-cache-app.js and calls fetch() from it. The server logs every request that reaches it, so
// "did the browser ask the server?" is answered by the server's own log, not by guessing.
//
//   node --disable-warning=ExperimentalWarning browser-cache-lab.js
//
// Needs a Chromium: set CHROMIUM_PATH to one you have, or run `npx playwright-core install chromium`.
// (This was run with CHROMIUM_PATH=/opt/pw-browsers/chromium, Chromium 141.0.7390.37.)

const { chromium } = require("playwright-core");
const { createApp } = require("./http-cache-app");

async function main() {
  const { app, log } = createApp({ orderRows: 0 }); // the lab never calls /report, so no database is built
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  const context = await browser.newContext(); // a fresh profile: an empty HTTP cache
  const page = await context.newPage();
  await page.goto(`${base}/blank`);
  console.log(`browser: ${browser.version()} (HeadlessChrome)\n`);

  // fetch() from inside the page, so the browser's HTTP cache is in the loop.
  const pageFetch = (url, init = {}) =>
    page.evaluate(async ([u, i]) => {
      const response = await fetch(u, i);
      const text = await response.text();
      return { status: response.status, version: JSON.parse(text).version };
    }, [url, init]);

  const requestsFor = (path) => log.filter((e) => e.path === path);
  const describe = (entries) =>
    entries.length === 0 ? "none" : entries.map((e) => `${e.status}${e.conditional ? " (conditional)" : ""}`).join(", ");

  console.log("== 1. the page calls fetch() three times, one after another. What reached the server?");
  console.log(`   ${"route".padEnd(11)} ${"the page saw".padEnd(18)} requests that reached the server`);
  for (const route of ["/max-age", "/no-cache", "/no-store", "/immutable", "/heuristic"]) {
    const url = `${route}?lab=1`;
    const seen = [];
    for (let i = 0; i < 3; i++) seen.push((await pageFetch(url)).status);
    const reached = requestsFor(url);
    console.log(`   ${route.padEnd(11)} ${seen.join(", ").padEnd(18)} ${reached.length} of 3: ${describe(reached)}`);
  }

  console.log("\n== 2. /max-age is in the cache and still fresh. What does each fetch() cache mode do?");
  console.log(`   ${"cache mode".padEnd(11)} request reached the server?   what the browser sent`);
  for (const mode of ["default", "force-cache", "no-store", "no-cache", "reload"]) {
    const url = `/max-age?mode=${mode}`;
    await pageFetch(url); // fill the cache with a normal fetch
    const before = requestsFor(url).length;
    await pageFetch(url, { cache: mode });
    const extra = requestsFor(url).slice(before);
    const sent = extra.length ? `${describe(extra)}, request Cache-Control: ${extra[0].requestCacheControl ?? "(none)"}` : "-";
    console.log(`   ${mode.padEnd(11)} ${(extra.length ? "yes" : "no").padEnd(28)} ${sent}`);
  }

  console.log("\n== 3. the price of max-age: the data changes on the server (POST /bump), and the page fetches again");
  for (const route of ["/max-age", "/no-cache"]) {
    const url = `${route}?lab=3`;
    const first = await pageFetch(url);
    const changed = await (await fetch(`${base}/bump`, { method: "POST" })).json();
    const second = await pageFetch(url);
    console.log(`   ${route.padEnd(10)} the page had version ${first.version}, the server changed to version ${changed.version}, the page now sees version ${second.version}   (server requests: ${describe(requestsFor(url))})`);
  }

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error("browser-cache-lab failed:", err);
  process.exit(1);
});
