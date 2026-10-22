// algorithms-demo.js
// The four algorithms in limiters.js, fed exactly the same traffic with a FAKE clock (time only
// moves when this script moves it, so nothing here sleeps and every run gives the same numbers).
//
//   node algorithms-demo.js

const { FixedWindow, SlidingWindowLog, SlidingWindowCounter, TokenBucket } = require("./limiters");
const { makeRandom } = require("./timing");

let t = 0;
const now = () => t;
const LIMIT = 10;
const WINDOW = 10_000; // "10 requests per 10 seconds"

const make = () => ({
  "fixed window       ": new FixedWindow({ limit: LIMIT, windowMs: WINDOW, now }),
  "sliding window log ": new SlidingWindowLog({ limit: LIMIT, windowMs: WINDOW, now }),
  "sliding win counter": new SlidingWindowCounter({ limit: LIMIT, windowMs: WINDOW, now }),
  "token bucket       ": new TokenBucket({ capacity: LIMIT, refillPerSecond: 1, now }), // 10 per 10 s, burst up to 10
});

console.log(`== 1. the boundary burst: limit ${LIMIT} per ${WINDOW / 1000} s. 10 requests at 9.9 s, then 10 more at 10.1 s (0.2 s apart)`);
for (const [name, limiter] of Object.entries(make())) {
  let first = 0;
  let second = 0;
  t = 9_900;
  for (let i = 0; i < 10; i++) if (limiter.check("a").allowed) first++;
  t = 10_100;
  for (let i = 0; i < 10; i++) if (limiter.check("a").allowed) second++;
  console.log(`   ${name}: accepted ${String(first).padStart(2)} then ${String(second).padStart(2)}   = ${String(first + second).padStart(2)} in 0.2 s`);
}

console.log(`\n== 2. a client sends 2 requests per second for 60 s (120 requests); the limit is ${LIMIT} per ${WINDOW / 1000} s, so about 60 should get through`);
for (const [name, limiter] of Object.entries(make())) {
  let accepted = 0;
  for (let i = 0; i < 120; i++) {
    t = i * 500;
    if (limiter.check("a").allowed) accepted++;
  }
  console.log(`   ${name}: accepted ${String(accepted).padStart(3)} of 120`);
}

console.log("\n== 3. sliding window counter against the exact sliding window log: 100,000 requests at random times");
// For each limiter: how many requests it accepted, and the MOST accepted requests inside any 10-second window
// (the limit is 10, so anything above 10 means the limiter let too many through).
function busiestWindow(times) {
  let best = 0;
  for (let i = 0, j = 0; i < times.length; i++) {
    while (times[i] - times[j] >= WINDOW) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
}
for (const [label, meanGapMs] of [["a heavy client (mean gap 700 ms) ", 700], ["a client near the limit (1100 ms)", 1100]]) {
  const random = makeRandom(4242);
  t = 0;
  const log = new SlidingWindowLog({ limit: LIMIT, windowMs: WINDOW, now });
  const counter = new SlidingWindowCounter({ limit: LIMIT, windowMs: WINDOW, now });
  const acceptedLog = [];
  const acceptedCounter = [];
  for (let i = 0; i < 100_000; i++) {
    t += -Math.log(1 - random()) * meanGapMs;
    if (log.check("a").allowed) acceptedLog.push(t);
    if (counter.check("a").allowed) acceptedCounter.push(t);
  }
  const diff = ((acceptedCounter.length - acceptedLog.length) / acceptedLog.length) * 100;
  console.log(`   ${label}: log accepted ${acceptedLog.length} (busiest 10 s: ${busiestWindow(acceptedLog)}), counter accepted ${acceptedCounter.length} (busiest 10 s: ${busiestWindow(acceptedCounter)}), ${diff.toFixed(1)}% difference`);
}

console.log("\n== 4. memory: numbers stored for ONE key after 1,000 requests (limit 1000 per 60 s)");
{
  t = 0;
  const big = {
    "fixed window       ": new FixedWindow({ limit: 1000, windowMs: 60_000, now }),
    "sliding window log ": new SlidingWindowLog({ limit: 1000, windowMs: 60_000, now }),
    "sliding win counter": new SlidingWindowCounter({ limit: 1000, windowMs: 60_000, now }),
    "token bucket       ": new TokenBucket({ capacity: 1000, refillPerSecond: 1000 / 60, now }),
  };
  for (const [name, limiter] of Object.entries(big)) {
    for (let i = 0; i < 1000; i++) limiter.check("a");
    console.log(`   ${name}: ${String(limiter.stateNumbers("a")).padStart(4)} numbers`);
  }
}

console.log("\n== 5. 10,000 different clients make one request each, then go quiet: keys being tracked");
for (const [name, limiter] of Object.entries(make())) {
  t = 0;
  for (let i = 0; i < 10_000; i++) limiter.check(`ip-${i}`);
  const before = limiter.size;
  t = 3 * WINDOW; // long after everyone's window or bucket has recovered
  limiter.sweep();
  console.log(`   ${name}: ${String(before).padStart(5)} keys held, ${String(limiter.size).padStart(5)} after sweep()`);
}
