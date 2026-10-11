const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2] || 4000);
const filePath = path.join(__dirname, "remote-photo.png");

http
  .createServer((req, res) => {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": data.length });
    res.end(data);
  })
  .listen(port, () => console.log(`remote image server on :${port}`));
