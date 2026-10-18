// preflight-cache-check.js
// A preflight is an extra round trip before a "non-simple" request. A
// browser may cache the server's answer for Access-Control-Max-Age seconds,
// so repeated calls skip it. This sends the same PUT three times:
// immediately, again right away, and once more after 6.5 seconds. Then
// compare how many OPTIONS requests the SERVER logged.
//
//   node preflight-cache-check.js <apiBase> <pageOrigin>

const { chromium } = require("playwright-core");

const apiBase = process.argv[2] || "http://localhost:4700";
const pageOrigin = process.argv[3] || "http://localhost:5000";

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(`${pageOrigin}/?api=${encodeURIComponent(apiBase)}`);

  const put = (label) =>
    page
      .evaluate(
        (api) =>
          fetch(api + "/items/1", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }).then((r) => r.status),
        apiBase
      )
      .then((status) => console.log(`${label}: status ${status}`));

  await put("PUT #1 (first call)          ");
  await put("PUT #2 (immediately after)   ");
  await page.waitForTimeout(6500);
  await put("PUT #3 (6.5 seconds later)   ");

  await browser.close();
}

main().catch((err) => {
  console.error("preflight-cache-check failed:", err.message.split("\n")[0]);
  process.exit(1);
});
