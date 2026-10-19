// dompurify-lab.js
// Sometimes users are SUPPOSED to send HTML (a rich-text comment, a CMS body).
// Escaping would turn their <b> into literal text, so the HTML has to be
// sanitized instead: parsed, then stripped down to a safe allowlist.
// DOMPurify does that inside a real DOM, so this loads its browser bundle
// into Chromium and checks what actually runs.
//
//   node dompurify-lab.js

const path = require("path");
const { chromium } = require("playwright-core");

const PURIFY = require.resolve("dompurify/dist/purify.min.js");

const dirty = [
  ["formatting only", `<p>Hello <b>world</b> and <i>friends</i></p>`],
  ["img onerror", `<img src=x onerror="window.__pwned=true">`],
  ["script tag", `<p>hi</p><script>window.__pwned=true</script>`],
  ["javascript: link", `<a href="javascript:window.__pwned=true">click me</a>`],
  ["svg onload", `<svg onload="window.__pwned=true"></svg>`],
  ["iframe srcdoc", `<iframe srcdoc="<script>parent.__pwned=true</script>"></iframe>`],
  ["safe link", `<a href="https://example.com/page" title="t">link</a>`],
  ["style tag", `<style>body{background:red}</style><p>text</p>`],
];

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent('<div id="target"></div>');
  await page.addScriptTag({ path: PURIFY });

  console.log("== 1. raw innerHTML vs DOMPurify.sanitize, same input (a javascript: link is clicked)");
  console.log("case                 raw innerHTML        sanitized innerHTML   output of sanitize()");
  for (const [label, html] of dirty) {
    const row = await page.evaluate(async ({ html }) => {
      const target = document.getElementById("target");
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const run = async (value) => {
        window.__pwned = false;
        target.innerHTML = value;
        // Click only a javascript: link. Clicking a normal link would navigate away.
        const link = target.querySelector('a[href^="javascript:"]');
        if (link) link.click();
        await wait(150);
        const ran = window.__pwned === true;
        target.innerHTML = "";
        return ran;
      };
      const clean = DOMPurify.sanitize(html);
      return { rawRan: await run(html), cleanRan: await run(clean), clean };
    }, { html });
    console.log(`${label.padEnd(20)} ${(row.rawRan ? "RAN" : "did not run").padEnd(20)} ${(row.cleanRan ? "RAN" : "did not run").padEnd(21)} ${JSON.stringify(row.clean)}`);
  }

  console.log("\n== 2. tightening the allowlist: only <b>, <i>, <a href>");
  const strict = await page.evaluate(() =>
    DOMPurify.sanitize(`<h1>title</h1><p>Hello <b>world</b> <a href="https://example.com" onclick="x()">link</a> <img src=x></p>`, {
      ALLOWED_TAGS: ["b", "i", "a"],
      ALLOWED_ATTR: ["href"],
    })
  );
  console.log("  ", JSON.stringify(strict));

  console.log("\n== 3. the mistake: sanitizing, then changing the string afterwards");
  const mutated = await page.evaluate(async () => {
    const target = document.getElementById("target");
    window.__pwned = false;
    const clean = DOMPurify.sanitize(`<p>hello</p>`);
    // "just add a greeting" with the raw name AFTER sanitizing:
    const name = `<img src=x onerror="window.__pwned=true">`;
    target.innerHTML = clean + name;
    await new Promise((r) => setTimeout(r, 150));
    const ran = window.__pwned === true;
    target.innerHTML = "";
    return ran;
  });
  console.log("  string built AFTER sanitize() ran the payload:", mutated);

  console.log("\nDOMPurify version in the page:", await page.evaluate(() => DOMPurify.version));
  await browser.close();
}

main().catch((err) => {
  console.error("dompurify-lab failed:", err.message.split("\n")[0]);
  process.exit(1);
});
