const fs = require("fs");

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

const before = process.memoryUsage().rss;
let peakRss = before;
let totalBytes = 0;

const stream = fs.createReadStream(__dirname + "/big.bin", {
  highWaterMark: 64 * 1024, // 64KB chunks, instead of the whole 400MB at once
});

stream.on("data", (chunk) => {
  totalBytes += chunk.length;
  const current = process.memoryUsage().rss;
  if (current > peakRss) peakRss = current;
});

stream.on("end", () => {
  const after = process.memoryUsage().rss;
  console.log(`createReadStream: streamed ${totalBytes} bytes in 64KB chunks`);
  console.log(`process RSS: ${mb(before)} -> ${mb(after)}, peak while streaming: ${mb(peakRss)}`);
});
