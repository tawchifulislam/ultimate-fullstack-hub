// cost-benchmark.js
// Milliseconds per password hash for each approach, on THIS machine.
// Numbers are machine-specific; the useful part is how they compare.
//
//   node cost-benchmark.js

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const argon2 = require("argon2");

const salt = crypto.randomBytes(16);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function bench(label, fn, runs = 3) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    await fn();
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  const m = median(times);
  console.log(`${label.padEnd(58)} ${m.toFixed(m < 1 ? 4 : 1).padStart(8)} ms`);
}

async function main() {
  await bench("SHA-256 (one hash, for scale)", () => crypto.createHash("sha256").update("pw").digest(), 200);
  await bench("PBKDF2-HMAC-SHA256, 600,000 iterations", () => crypto.pbkdf2Sync("pw", salt, 600000, 32, "sha256"));
  await bench("bcrypt cost 10 (bcryptjs)", () => bcrypt.hashSync("pw", 10));
  await bench("bcrypt cost 12 (bcryptjs)", () => bcrypt.hashSync("pw", 12));
  await bench("scrypt N=2^14 r=8 p=1 (Node default)", () => crypto.scryptSync("pw", salt, 32));
  await bench("scrypt N=2^17 r=8 p=1 (OWASP minimum)", () => crypto.scryptSync("pw", salt, 32, { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }));
  await bench("argon2id m=19456 KiB t=2 p=1 (OWASP minimum)", () => argon2.hash("pw", { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }));
  await bench("argon2id m=65536 KiB t=3 p=1", () => argon2.hash("pw", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 }));
}

main().catch((err) => { console.error(err); process.exit(1); });
