// setTimeout(fn, 0) and fs.readFile both get scheduled "immediately".
// Then a recursive process.nextTick() loop starts. Because the nextTick
// queue is fully drained before the event loop is allowed to move to its
// next phase, and each nextTick callback here schedules ANOTHER nextTick
// before returning, the loop never gets a chance to reach the timers or
// poll phase until the recursion finally stops on its own.
const fs = require("fs");

const scheduledAt = Date.now();

setTimeout(() => {
  console.log(`timeout fired after ${Date.now() - scheduledAt}ms (asked for 0ms)`);
}, 0);

fs.readFile(__filename, () => {
  console.log(`fs.readFile callback fired after ${Date.now() - scheduledAt}ms`);
});

let count = 0;
const TARGET_MS = 1000;

function starve() {
  count++;
  if (Date.now() - scheduledAt < TARGET_MS) {
    process.nextTick(starve);
  } else {
    console.log(`nextTick recursion stopped after ${count} calls, ${Date.now() - scheduledAt}ms`);
  }
}

process.nextTick(starve);
