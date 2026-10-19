// react-escaping.js
// React escapes values placed in JSX for you, which removes the most common
// XSS bug. It does not make XSS impossible: dangerouslySetInnerHTML is a raw
// innerHTML, and URLs and attributes still need care. This renders each case
// with react-dom/server and then loads the output into Chromium to see
// whether it runs. (No JSX, so there is no build step: createElement only.)
//
//   node react-escaping.js

const { createElement: h } = require("react");
const { renderToString } = require("react-dom/server");
const { chromium } = require("playwright-core");

const ATTACK = `<img src=x onerror="window.__pwned=true">`;
const JS_URL = `javascript:window.__pwned=true`;

const cases = [
  ["1. text child", () => h("div", null, ATTACK)],
  ["2. attribute value", () => h("input", { defaultValue: `" onfocus="window.__pwned=true" autofocus="` })],
  ["3. dangerouslySetInnerHTML", () => h("div", { dangerouslySetInnerHTML: { __html: ATTACK } })],
  ["4. href from user input", () => h("a", { id: "link", href: JS_URL }, "click me")],
  ["5. href with a scheme check", () => h("a", { id: "link", href: /^https?:/i.test(JS_URL) ? JS_URL : "#" }, "click me")],
  // Control: the same javascript: link as raw HTML. This proves the click in this
  // script really would run the payload if React had not rewritten the href.
  ["6. control: same link, raw HTML", () => h("div", { dangerouslySetInnerHTML: { __html: `<a id="link" href="${JS_URL}">click me</a>` } })],
];

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  console.log("case                           payload ran?  link click?   HTML that React produced");
  for (const [label, make] of cases) {
    const html = renderToString(make());
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><body>${html}</body>`);
    // The link only exists in cases 4 and 5. Record whether the click really happened,
    // otherwise "did not run" could just mean "nothing was clicked".
    let clicked = "n/a";
    if (await page.$("#link")) {
      clicked = await page.click("#link", { timeout: 1000 }).then(() => "clicked", () => "CLICK FAILED");
    }
    await page.waitForTimeout(250);
    const ran = await page.evaluate(() => window.__pwned === true);
    await page.close();
    console.log(`${label.padEnd(30)} ${(ran ? "RAN" : "did not run").padEnd(13)} ${clicked.padEnd(13)} ${html}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error("react-escaping failed:", err.message.split("\n")[0]);
  process.exit(1);
});
