// fast-hash-problem.js
// Why "store the password" and "store a SHA-256 of the password" both fail
// once the database leaks. All users and passwords below are made up.
//
//   node fast-hash-problem.js

const crypto = require("crypto");

const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

const accounts = [
  { username: "nadia", password: "sunshine123" },
  { username: "omar", password: "sunshine123" },       // same password as nadia
  { username: "karim", password: "password1" },
  { username: "lina", password: "Tr0ub4dor&3-purple-kettle" }, // long and unusual
];

// ---- 1. plaintext ----
console.log("== 1. the leaked table when passwords are stored as plain text");
for (const a of accounts) console.log(`  ${a.username.padEnd(6)} ${a.password}`);
console.log("  (nothing to crack: the leak IS the passwords)");

// ---- 2. unsalted SHA-256 ----
console.log("\n== 2. the leaked table when each password is stored as an unsalted SHA-256");
const leaked = accounts.map((a) => ({ username: a.username, hash: sha256(a.password) }));
for (const row of leaked) console.log(`  ${row.username.padEnd(6)} ${row.hash.slice(0, 24)}...`);
console.log(`  nadia and omar have the same hash: ${leaked[0].hash === leaked[1].hash}  (visible without cracking anything)`);

// An attacker precomputes hash -> password for a list of common passwords ONCE.
const commonPasswords = ["password", "password1", "123456", "qwerty", "letmein", "sunshine123", "iloveyou", "admin", "welcome", "dragon"];
const lookup = new Map(commonPasswords.map((p) => [sha256(p), p]));

console.log("\n  looking each leaked hash up in a precomputed table of 10 common passwords:");
const start = process.hrtime.bigint();
for (const row of leaked) {
  const found = lookup.get(row.hash);
  console.log(`  ${row.username.padEnd(6)} -> ${found ? `CRACKED: "${found}"` : "not in the table"}`);
}
const ms = Number(process.hrtime.bigint() - start) / 1e6;
console.log(`  all four lookups took ${ms.toFixed(2)} ms`);

// ---- 3. how fast is one SHA-256 guess? ----
console.log("\n== 3. how many SHA-256 guesses does this machine make per second (one thread)?");
const N = 300_000;
const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) sha256("guess" + i);
const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
console.log(`  ${N.toLocaleString()} guesses in ${seconds.toFixed(2)} s = ${Math.round(N / seconds).toLocaleString()} per second`);
console.log("  (dedicated cracking hardware is far faster than this; that was not measured here)");
