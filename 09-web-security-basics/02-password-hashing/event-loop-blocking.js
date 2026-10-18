// event-loop-blocking.js
// Password hashing is deliberately slow. Where that slow work runs decides
// whether your server keeps answering other requests (Topic 72):
//   A. a ticker that should fire every 10 ms reveals how long the event loop
//      was blocked by each hashing call;
//   B. hashing that runs in libuv's thread pool can still delay OTHER work
//      that uses the same pool, such as fs calls.
//
//   node event-loop-blocking.js
//   UV_THREADPOOL_SIZE=16 node event-loop-blocking.js     (compare section B)

const crypto = require("crypto");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { promisify } = require("util");
const bcrypt = require("bcryptjs");
const argon2 = require("argon2");

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const salt = crypto.randomBytes(16);

// Runs `work` while a 10 ms ticker records the longest gap between ticks.
async function measure(label, work) {
  let last = process.hrtime.bigint();
  let worst = 0;
  const ticker = setInterval(() => {
    const now = process.hrtime.bigint();
    worst = Math.max(worst, Number(now - last) / 1e6);
    last = now;
  }, 10);
  await new Promise((r) => setTimeout(r, 50)); // let the ticker settle
  last = process.hrtime.bigint();
  worst = 0;

  const start = process.hrtime.bigint();
  await work();
  const total = Number(process.hrtime.bigint() - start) / 1e6;
  await new Promise((r) => setTimeout(r, 30));
  clearInterval(ticker);
  console.log(`  ${label.padEnd(36)} total ${total.toFixed(0).padStart(5)} ms   longest gap between ticks ${worst.toFixed(0).padStart(5)} ms`);
}

async function main() {
  console.log("== A. how long was the event loop blocked? (the ticker should fire every 10 ms)");
  await measure("crypto.scryptSync", () => crypto.scryptSync("pw", salt, 32, SCRYPT));
  await measure("crypto.scrypt (async)", () => scrypt("pw", salt, 32, SCRYPT));
  await measure("bcryptjs.hashSync (cost 12)", () => bcrypt.hashSync("pw", 12));
  await measure("bcryptjs.hash (async, cost 12)", () => bcrypt.hash("pw", 12));
  await measure("argon2.hash (OWASP minimum)", () => argon2.hash("pw", { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }));

  console.log(`\n== B. can hashing delay unrelated work in the thread pool?   UV_THREADPOOL_SIZE = ${process.env.UV_THREADPOOL_SIZE || "unset (default 4)"}`);
  const small = path.join(os.tmpdir(), "pool-probe.tmp");
  await fs.writeFile(small, "hello");

  const readLatency = async () => {
    const t = process.hrtime.bigint();
    await fs.readFile(small);
    return Number(process.hrtime.bigint() - t) / 1e6;
  };

  const idle = [];
  for (let i = 0; i < 5; i++) idle.push(await readLatency());
  console.log(`  fs.readFile when nothing else is running:   ${Math.max(...idle).toFixed(2)} ms (slowest of 5)`);

  // Eight scrypt hashes at once (N=2^16 each, 64 MiB), then a tiny file read right behind them.
  const heavy = { N: 2 ** 16, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
  const jobs = Array.from({ length: 8 }, () => scrypt("pw", salt, 32, heavy));
  const started = process.hrtime.bigint();
  const latency = await readLatency();
  console.log(`  fs.readFile queued behind 8 scrypt hashes:  ${latency.toFixed(0)} ms`);
  await Promise.all(jobs);
  console.log(`  all 8 hashes finished after ${(Number(process.hrtime.bigint() - started) / 1e6).toFixed(0)} ms`);

  await fs.unlink(small);
}

main().catch((err) => { console.error(err); process.exit(1); });
