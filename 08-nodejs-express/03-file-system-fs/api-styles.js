const fs = require("fs");
const fsPromises = require("fs/promises");

const file = __dirname + "/sample.txt";
fs.writeFileSync(file, "Hello from the fs module.\n");

// 1. Callback style: the original Node API, error-first callback.
fs.readFile(file, "utf8", (err, data) => {
  if (err) throw err;
  console.log("callback style:", JSON.stringify(data));
});

// 2. Promise style: fs/promises, same operations, async/await-friendly.
async function readWithPromises() {
  const data = await fsPromises.readFile(file, "utf8");
  console.log("promise style :", JSON.stringify(data));
}
readWithPromises();

// 3. Sync style: blocks the calling thread until done, returns the value
// directly instead of taking a callback, see sync-blocks-event-loop.js
// for why this matters.
const dataSync = fs.readFileSync(file, "utf8");
console.log("sync style    :", JSON.stringify(dataSync));

console.log("(this line runs before the callback/promise logs above print,\n since those are async and this synchronous code runs first)");
