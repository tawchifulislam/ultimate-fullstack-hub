// scrypt-builtin.js
// Password hashing with ONLY Node's built-in crypto module (no install).
// Shows the storage format, constant-time comparison, a memory-limit error,
// and the async version.
//
//   node scrypt-builtin.js

const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

// OWASP's minimum for scrypt: N=2^17 (128 MiB), r=8, p=1.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LENGTH = 32;
const MAXMEM = 256 * 1024 * 1024; // Node's default limit (32 MiB) is too low for N=2^17

// Stored format keeps the parameters WITH the hash, so they can change later:
//   scrypt$N$r$p$<salt base64>$<hash base64>
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAXMEM });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

async function verifyPassword(stored, password) {
  const [scheme, N, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !hashB64) return false; // not our format
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: MAXMEM,
  });
  // timingSafeEqual compares in constant time; it THROWS if the lengths differ,
  // which cannot happen here because we asked scrypt for expected.length bytes.
  return crypto.timingSafeEqual(actual, expected);
}

async function main() {
  const time = async (fn) => { const s = process.hrtime.bigint(); const v = await fn(); return [v, Number(process.hrtime.bigint() - s) / 1e6]; };

  console.log("== 1. hash a password");
  const [stored, hashMs] = await time(() => hashPassword("correct horse battery staple"));
  console.log("  stored string:", stored);
  console.log(`  parts: ${stored.split("$").length}, salt ${Buffer.from(stored.split("$")[4], "base64").length} bytes, hash ${Buffer.from(stored.split("$")[5], "base64").length} bytes`);
  console.log(`  took ${hashMs.toFixed(0)} ms`);

  console.log("\n== 2. verify");
  console.log("  correct password       ->", await verifyPassword(stored, "correct horse battery staple"));
  console.log("  wrong password         ->", await verifyPassword(stored, "correct horse battery stapler"));
  console.log("  empty password         ->", await verifyPassword(stored, ""));
  console.log("  garbage stored string  ->", await verifyPassword("not-a-hash", "anything"));

  console.log("\n== 3. the same password hashed twice");
  const second = await hashPassword("correct horse battery staple");
  console.log("  identical stored strings?", stored === second);
  console.log("  both still verify?      ", (await verifyPassword(stored, "correct horse battery staple")) && (await verifyPassword(second, "correct horse battery staple")));

  console.log("\n== 4. Node's default memory limit");
  try {
    crypto.scryptSync("pw", crypto.randomBytes(16), 32, { N: 2 ** 17, r: 8, p: 1 }); // no maxmem
  } catch (err) {
    console.log("  N=2^17 without maxmem ->", err.code);
  }
  const small = crypto.scryptSync("pw", crypto.randomBytes(16), 32, { N: 2 ** 14, r: 8, p: 1 });
  console.log("  N=2^14 without maxmem -> works,", small.length, "bytes (but below the OWASP minimum)");

  console.log("\n== 5. a stored string with weaker parameters still verifies (this is how upgrades work)");
  const weakSalt = crypto.randomBytes(16);
  const weakHash = crypto.scryptSync("old-password", weakSalt, 32, { N: 2 ** 14, r: 8, p: 1 });
  const weakStored = ["scrypt", 2 ** 14, 8, 1, weakSalt.toString("base64"), weakHash.toString("base64")].join("$");
  console.log("  verify old-password    ->", await verifyPassword(weakStored, "old-password"));
  console.log("  stored N (2^14) differs from current N (2^17):", Number(weakStored.split("$")[1]) !== PARAMS.N);
}

main().catch((err) => { console.error(err); process.exit(1); });
