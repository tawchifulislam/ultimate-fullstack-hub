// bcrypt-demo.js
// bcrypt through `bcryptjs` (pure JavaScript, no native build needed).
// Shows the hash format, the cost factor, and bcrypt's 72-byte limit.
//
//   node bcrypt-demo.js

const bcrypt = require("bcryptjs");

const ms = (start) => Number(process.hrtime.bigint() - start) / 1e6;

async function main() {
  console.log("== 1. hash and compare");
  const hash = await bcrypt.hash("correct horse battery staple", 12);
  console.log("  hash:", hash);
  console.log("  correct password ->", await bcrypt.compare("correct horse battery staple", hash));
  console.log("  wrong password   ->", await bcrypt.compare("correct horse battery stapler", hash));

  console.log("\n== 2. what is inside the 60-character string");
  const [, version, cost, rest] = hash.split("$");
  console.log(`  length ${hash.length}; version "$${version}$"; cost ${cost}; salt "${rest.slice(0, 22)}" (${rest.slice(0, 22).length} chars); hash "${rest.slice(22)}" (${rest.slice(22).length} chars)`);
  console.log("  bcrypt.getRounds(hash) ->", bcrypt.getRounds(hash));

  console.log("\n== 3. the same password hashed twice");
  const again = await bcrypt.hash("correct horse battery staple", 12);
  console.log("  identical?", hash === again, "| salts:", hash.slice(7, 29), "vs", again.slice(7, 29));

  console.log("\n== 4. the cost factor is a power of two: each +1 doubles the work (hashSync, 3 runs each)");
  for (const rounds of [8, 9, 10, 11, 12, 13]) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const t = process.hrtime.bigint();
      bcrypt.hashSync("pw", rounds);
      runs.push(ms(t));
    }
    runs.sort((a, b) => a - b);
    console.log(`  cost ${String(rounds).padStart(2)}: median ${runs[1].toFixed(0).padStart(5)} ms`);
  }

  console.log("\n== 5. the 72-byte limit");
  const base = "a".repeat(72);
  const h = bcrypt.hashSync(base + "X", 10); // 73 bytes, the last one is an X
  console.log("  bcrypt.truncates(73-byte password) ->", bcrypt.truncates(base + "X"));
  console.log("  hashed  72 x 'a' + 'X'; compare with 72 x 'a' + 'Y' ->", bcrypt.compareSync(base + "Y", h));
  console.log("  compare with only the 72 x 'a'                     ->", bcrypt.compareSync(base, h));
  console.log("  compare with 71 x 'a'                              ->", bcrypt.compareSync("a".repeat(71), h));
  const multi = "é".repeat(40); // 'é' is 2 bytes in UTF-8
  console.log(`  "é" x 40 is ${Buffer.byteLength(multi)} bytes; truncates? ->`, bcrypt.truncates(multi));
}

main().catch((err) => { console.error(err); process.exit(1); });
