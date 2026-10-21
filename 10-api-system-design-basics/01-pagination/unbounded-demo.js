// unbounded-demo.js
// What "no pagination" costs: GET /posts/all against 100,000 rows, next to one page.
// The server runs in this process on a random port and is called with fetch.
//
//   node --disable-warning=ExperimentalWarning unbounded-demo.js

const { createApp } = require("./pagination-app");
const { time } = require("./timing");

async function main() {
  const server = await new Promise((resolve) => { const s = createApp().listen(0, () => resolve(s)); });
  const base = `http://localhost:${server.address().port}`;

  async function measure(label, path) {
    const start = process.hrtime.bigint();
    const res = await fetch(base + path);
    const text = await res.text();
    const requestMs = Number(process.hrtime.bigint() - start) / 1e6;
    const parsed = time(() => JSON.parse(text));
    const rows = Array.isArray(parsed.value) ? parsed.value.length : parsed.value.data.length;
    console.log(`${label.padEnd(34)} ${String(res.status)}  ${String(rows).padStart(7)} rows  ${(text.length / 1024).toFixed(1).padStart(10)} KiB  request ${requestMs.toFixed(1).padStart(7)} ms  JSON.parse ${parsed.ms.toFixed(1).padStart(6)} ms`);
  }

  console.log("endpoint                           status     rows          size   time to download      time to parse");
  await measure("GET /posts/all (no pagination)", "/posts/all");
  await measure("GET /posts/offset (20 per page)", "/posts/offset");
  await measure("GET /posts/cursor (20 per page)", "/posts/cursor");
  await measure("GET /posts/offset?pageSize=100", "/posts/offset?pageSize=100");

  server.close();
}

main().catch((err) => {
  console.error("unbounded-demo failed:", err.message);
  process.exit(1);
});
