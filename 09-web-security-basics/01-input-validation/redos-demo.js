// redos-demo.js
// Validation code can itself be the vulnerability. A regular expression with
// nested quantifiers can take exponential time on input that ALMOST matches
// ("catastrophic backtracking", a ReDoS). Node runs JavaScript on one
// thread (Topic 72), so while the regex runs, nothing else is served.
//
//   node redos-demo.js

const VULNERABLE = /^(\w+\s?)+$/;   // "words separated by optional spaces", nested quantifiers
const SAFE = /^[\w ]+$/;            // same idea, one quantifier, no nesting

const evil = (n) => "a".repeat(n) + "!"; // almost matches, then fails at the last character

function time(fn) {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start) / 1e6; // ms
}

console.log("== 1. time for the vulnerable regex as the input grows by 2 characters");
console.log("length   milliseconds");
for (let n = 16; n <= 40; n += 2) {
  const ms = time(() => VULNERABLE.test(evil(n)));
  console.log(String(n + 1).padStart(6), ms.toFixed(1).padStart(12));
  if (ms > 400) {
    console.log("        (stopping here: each step costs several times the last one)");
    break;
  }
}

console.log("\n== 2. the same inputs against the safe regex");
for (const n of [16, 26, 1000, 100000]) {
  console.log(`length ${String(n + 1).padStart(6)}: ${time(() => SAFE.test(evil(n))).toFixed(2)} ms`);
}

console.log("\n== 3. what the blocked event loop looks like");
// A timer that should fire every 50 ms. We record the longest gap between ticks.
let last = Date.now();
let worstGap = 0;
const ticker = setInterval(() => {
  const now = Date.now();
  worstGap = Math.max(worstGap, now - last);
  last = now;
}, 50);

setTimeout(() => {
  const blockedFor = time(() => VULNERABLE.test(evil(28)));
  setTimeout(() => {
    clearInterval(ticker);
    console.log(`one regex call took ${blockedFor.toFixed(0)} ms; the longest gap between 50 ms ticks was ${worstGap} ms`);

    console.log("\n== 4. does a typical length limit save the vulnerable regex?");
    const MAX = 100; // a perfectly normal limit for a "name" field
    const guarded = (re) => (s) => s.length <= MAX && re.test(s);
    for (const [label, re] of [["vulnerable regex + length limit", VULNERABLE], ["safe regex + length limit", SAFE]]) {
      for (const n of [28, 150]) {
        const ms = time(() => guarded(re)(evil(n)));
        console.log(`${label.padEnd(34)} input length ${String(n + 1).padStart(4)}: ${ms.toFixed(2).padStart(9)} ms`);
      }
    }
  }, 120);
}, 200);
