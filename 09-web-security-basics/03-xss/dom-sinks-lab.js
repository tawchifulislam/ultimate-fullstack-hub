// dom-sinks-lab.js
// Which browser APIs turn a STRING into running script? Each case puts the
// same kind of attacker string into the page in a different way and checks,
// in a real Chromium, whether the payload ran (it sets window.__pwned).
//
//   node dom-sinks-lab.js

const { chromium } = require("playwright-core");

const MARK = "window.__pwned = true";

const cases = [
  ["innerHTML with <script>", `el.innerHTML = '<script>${MARK}<\\/script>'`],
  ["innerHTML with <img onerror>", `el.innerHTML = '<img src=x onerror="${MARK}">'`],
  ["innerHTML with <svg onload>", `el.innerHTML = '<svg onload="${MARK}"></svg>'`],
  ["insertAdjacentHTML with <img onerror>", `el.insertAdjacentHTML('beforeend', '<img src=x onerror="${MARK}">')`],
  ["textContent with <img onerror>", `el.textContent = '<img src=x onerror="${MARK}">'`],
  ["innerText with <img onerror>", `el.innerText = '<img src=x onerror="${MARK}">'`],
  ["createElement + textContent", `const p = document.createElement('p'); p.textContent = '<img src=x onerror="${MARK}">'; el.appendChild(p)`],
  ["setAttribute('href', 'javascript:...') then a click", `const a = document.createElement('a'); a.id = 'link'; a.setAttribute('href', 'javascript:${MARK}'); a.textContent = 'click me'; el.appendChild(a)`, "click"],
  ["eval(string)", `eval('${MARK}')`],
  ["setTimeout(string, 0)", `setTimeout('${MARK}', 0)`],
  ["new Function(string)()", `new Function('${MARK}')()`],
];

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  console.log("did the payload run? (window.__pwned set)\n");

  for (const [label, code, extra] of cases) {
    const page = await browser.newPage();
    await page.setContent('<div id="target"></div>');
    await page.evaluate((src) => {
      const el = document.getElementById("target");
      new Function("el", src)(el);
    }, code);
    if (extra === "click") await page.click("#link").catch(() => {});
    await page.waitForTimeout(250);
    const ran = await page.evaluate(() => window.__pwned === true);
    const shown = (await page.evaluate(() => document.getElementById("target").innerHTML)).slice(0, 60);
    console.log(`${label.padEnd(54)} ${ran ? "RAN    " : "did not run"}   page now contains: ${shown || "(nothing)"}`);
    await page.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error("dom-sinks-lab failed:", err.message.split("\n")[0]);
  process.exit(1);
});
