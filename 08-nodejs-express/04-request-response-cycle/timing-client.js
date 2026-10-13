const http = require("http");

const path = process.argv[2]; // "/stream" or "/buffer"
const start = Date.now();

http.get(`http://localhost:4104${path}`, (res) => {
  res.on("data", (chunk) => {
    console.log(`  received ${JSON.stringify(chunk.toString())} at ${Date.now() - start}ms`);
  });
  res.on("end", () => {
    console.log(`  response fully ended at ${Date.now() - start}ms`);
  });
});
