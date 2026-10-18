// salt-demo.js
// What a salt fixes, and what it does NOT fix.
//   tier 1: salted, fast hash   (SHA-256)   - stops precomputed tables only
//   tier 2: salted, SLOW hash   (scrypt)    - also makes every guess expensive
//
//   node salt-demo.js

const crypto = require("crypto");

const commonPasswords = ["password", "password1", "123456", "qwerty", "letmein", "sunshine123", "iloveyou", "admin", "welcome", "dragon"];
const hrms = (start) => Number(process.hrtime.bigint() - start) / 1e6;

// ---- tier 1: salted SHA-256 ----
const saltedSha = (salt, password) => crypto.createHash("sha256").update(salt).update(password).digest("hex");

const saltNadia = crypto.randomBytes(16);
const saltOmar = crypto.randomBytes(16);
const nadia = saltedSha(saltNadia, "sunshine123");
const omar = saltedSha(saltOmar, "sunshine123");

console.log("== 1. salted SHA-256: the same password now gives different hashes");
console.log(`  nadia: salt ${saltNadia.toString("hex").slice(0, 12)}...  hash ${nadia.slice(0, 20)}...`);
console.log(`  omar:  salt ${saltOmar.toString("hex").slice(0, 12)}...  hash ${omar.slice(0, 20)}...`);
console.log(`  identical hashes? ${nadia === omar}`);

// A table built WITHOUT the salt (like the one in fast-hash-problem.js) is useless now.
const unsaltedTable = new Map(commonPasswords.map((p) => [crypto.createHash("sha256").update(p).digest("hex"), p]));
console.log(`\n== 2. a precomputed (unsalted) table against the salted hash: ${unsaltedTable.get(nadia) ? "CRACKED" : "no match"}`);

// ...but the salt is stored beside the hash, so a targeted attack just uses it.
console.log("\n== 3. the salt is not a secret: attacking ONE user's salted hash with the same 10-word list");
let t = process.hrtime.bigint();
let hit = commonPasswords.find((p) => saltedSha(saltNadia, p) === nadia);
console.log(`  salted SHA-256: ${hit ? `CRACKED "${hit}"` : "not found"} in ${hrms(t).toFixed(3)} ms`);

const N = 200_000;
t = process.hrtime.bigint();
for (let i = 0; i < N; i++) saltedSha(saltNadia, "guess" + i);
const shaPerSec = Math.round(N / (hrms(t) / 1000));
console.log(`  salted SHA-256 guess rate: ${shaPerSec.toLocaleString()} per second (one thread)`);

// ---- tier 2: salted scrypt at the OWASP minimum ----
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const scryptHash = (salt, password) => crypto.scryptSync(password, salt, 32, SCRYPT);

const scryptNadia = scryptHash(saltNadia, "sunshine123");
console.log("\n== 4. the same attack against salted scrypt (N=2^17, r=8, p=1)");
t = process.hrtime.bigint();
const index = commonPasswords.findIndex((p) => scryptHash(saltNadia, p).equals(scryptNadia));
const listMs = hrms(t);
console.log(`  scrypt: ${index >= 0 ? `CRACKED "${commonPasswords[index]}" after ${index + 1} guesses` : "not found in 10 guesses"}, ${listMs.toFixed(0)} ms in total`);

t = process.hrtime.bigint();
const GUESSES = 4;
for (let i = 0; i < GUESSES; i++) scryptHash(saltNadia, "guess" + i);
const perGuess = hrms(t) / GUESSES;
console.log(`  scrypt cost per guess: ${perGuess.toFixed(0)} ms = ${(1000 / perGuess).toFixed(1)} guesses per second (one thread)`);
console.log(`\n== 5. ratio: one thread makes about ${Math.round(shaPerSec / (1000 / perGuess)).toLocaleString()} times more salted-SHA-256 guesses per second than scrypt guesses`);
