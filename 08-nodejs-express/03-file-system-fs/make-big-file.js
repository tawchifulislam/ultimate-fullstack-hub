// Generates the 400MB big.bin file the other demos in this folder read.
// Not shipped itself, run this once before trying sync-blocks-event-loop.js,
// async-does-not-block.js, whole-file-memory.js, or stream-memory.js.
const fs = require("fs");

const size = 400 * 1024 * 1024; // 400MB
const chunk = Buffer.alloc(1024 * 1024, "x"); // 1MB chunk, repeated
const fd = fs.openSync(__dirname + "/big.bin", "w");
for (let i = 0; i < size / chunk.length; i++) fs.writeSync(fd, chunk);
fs.closeSync(fd);

console.log("wrote", fs.statSync(__dirname + "/big.bin").size, "bytes to big.bin");
