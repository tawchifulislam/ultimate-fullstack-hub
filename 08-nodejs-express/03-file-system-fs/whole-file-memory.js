const fs = require("fs");

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

const before = process.memoryUsage().rss;
const data = fs.readFileSync(__dirname + "/big.bin");
const after = process.memoryUsage().rss;

console.log(`readFileSync: loaded ${data.length} bytes`);
console.log(`process RSS: ${mb(before)} -> ${mb(after)}`);
