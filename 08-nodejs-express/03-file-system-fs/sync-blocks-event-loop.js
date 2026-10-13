const fs = require("fs");

// A ticking timer: if the event loop is free, "tick" should print roughly
// every 20ms the whole time this script runs.
let ticks = 0;
const timer = setInterval(() => {
  ticks++;
  console.log(`tick ${ticks} at ${Date.now() - start}ms`);
}, 20);

const start = Date.now();
console.log("starting readFileSync on a 400MB file...");

const before = Date.now();
const data = fs.readFileSync(__dirname + "/big.bin");
const after = Date.now();

console.log(`readFileSync returned ${data.length} bytes, took ${after - before}ms`);
console.log("during that time, how many ticks fired? count them above.");

setTimeout(() => {
  clearInterval(timer);
  console.log(`total ticks in ~1s after the sync read: ${ticks}`);
  process.exit(0);
}, 1000);
