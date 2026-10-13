const fs = require("fs");

let ticks = 0;
const start = Date.now();
const timer = setInterval(() => {
  ticks++;
  console.log(`tick ${ticks} at ${Date.now() - start}ms`);
}, 20);

console.log("starting fs.readFile (async) on the same 400MB file...");
const before = Date.now();

fs.readFile(__dirname + "/big.bin", (err, data) => {
  const after = Date.now();
  console.log(`fs.readFile callback returned ${data.length} bytes, took ${after - before}ms`);
  console.log(`ticks that fired WHILE the read was in flight: ${ticks}`);

  setTimeout(() => {
    clearInterval(timer);
    process.exit(0);
  }, 200);
});
