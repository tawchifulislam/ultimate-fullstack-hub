// argon2-demo.js
// argon2id through the `argon2` npm package (a native addon that ships its
// own prebuilt binary). Shows the PHC string, the parameters, timing for a
// few settings, and needsRehash().
//
//   node argon2-demo.js

const argon2 = require("argon2");

const ms = (start) => Number(process.hrtime.bigint() - start) / 1e6;

// OWASP lists several equivalent minimums for argon2id (p=1); this is the first one.
const OWASP_MIN = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function main() {
  console.log("== 1. hash with the package's defaults, except forcing argon2id");
  const hash = await argon2.hash("correct horse battery staple", { type: argon2.argon2id });
  console.log("  ", hash);
  const [, algorithm, version, params, salt, digest] = hash.split("$");
  console.log(`  algorithm ${algorithm}; ${version}; parameters ${params}; salt ${salt.length} base64 chars; hash ${digest.length} base64 chars`);

  console.log("\n== 2. verify");
  console.log("  correct password ->", await argon2.verify(hash, "correct horse battery staple"));
  console.log("  wrong password   ->", await argon2.verify(hash, "correct horse battery stapler"));

  console.log("\n== 3. the same password twice");
  const again = await argon2.hash("correct horse battery staple", { type: argon2.argon2id });
  console.log("  identical?", hash === again);

  console.log("\n== 4. time per hash for a few settings (median of 3)");
  const settings = [
    ["OWASP first option  m=19456 KiB t=2 p=1", OWASP_MIN],
    ["stronger            m=65536 KiB t=3 p=1", { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 }],
    ["package default     (see section 1)", { type: argon2.argon2id }],
  ];
  for (const [label, options] of settings) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const t = process.hrtime.bigint();
      await argon2.hash("pw", options);
      runs.push(ms(t));
    }
    runs.sort((a, b) => a - b);
    console.log(`  ${label.padEnd(44)} ${runs[1].toFixed(0).padStart(5)} ms`);
  }

  console.log("\n== 5. needsRehash(): is this stored hash weaker than what we want today?");
  const old = await argon2.hash("pw", OWASP_MIN);
  const wanted = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };
  console.log("  hash made with the OWASP minimum, wanted = stronger  ->", argon2.needsRehash(old, wanted));
  console.log("  hash made with the OWASP minimum, wanted = same      ->", argon2.needsRehash(old, OWASP_MIN));
  const fresh = await argon2.hash("pw", wanted);
  console.log("  hash made with the stronger settings, wanted = same  ->", argon2.needsRehash(fresh, wanted));
  console.log("  the old hash still verifies:", await argon2.verify(old, "pw"));

  console.log("\n== 6. what argon2.verify() does with strings that are not argon2 hashes");
  const bcryptHash = "$2b$12$GY.Q3Y7d20lfopWtppJas.eQNpFuB1bV3olRDTTwD70PjXY9u6aZ2";
  for (const [label, value] of [["a bcrypt hash", bcryptHash], ["plain text", "not-a-hash"], ["an empty string", ""]]) {
    try {
      console.log(`  ${label.padEnd(16)} -> ${await argon2.verify(value, "pw")}`);
    } catch (err) {
      console.log(`  ${label.padEnd(16)} -> THROWS "${err.message}"`);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
