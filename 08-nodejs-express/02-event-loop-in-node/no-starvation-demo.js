// Same experiment as starvation-demo.js, but the recursive scheduling uses
// setImmediate() instead of process.nextTick(). setImmediate callbacks run
// in the check phase, which happens once per loop iteration, so a
// recursive setImmediate call defers to the NEXT iteration instead of
// monopolizing the current one. Timers and I/O get to run in between.
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

function loop() {
  count++;
  if (Date.now() - scheduledAt < TARGET_MS) {
    setImmediate(loop);
  } else {
    console.log(`setImmediate recursion stopped after ${count} calls, ${Date.now() - scheduledAt}ms`);
  }
}

setImmediate(loop);
