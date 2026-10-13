const http = require("http");
const { Readable } = require("stream");

// A deliberately slow source: 5 chunks, 200ms apart, standing in for
// anything slow to produce (a big file, a slow database cursor, a
// third-party API). Simulates ~1 second of total work either way.
function makeSlowSource() {
  let i = 0;
  return new Readable({
    read() {
      if (i >= 5) {
        this.push(null); // signals "no more data"
        return;
      }
      i++;
      setTimeout(() => this.push(`chunk-${i} `), 200);
    },
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/stream") {
    // pipe() forwards each chunk to the client the instant it's produced.
    res.writeHead(200, { "Content-Type": "text/plain" });
    makeSlowSource().pipe(res);
  } else if (req.url === "/buffer") {
    // Collect everything first, THEN send it all as one response. The
    // client gets nothing until the entire ~1 second of work is done.
    const source = makeSlowSource();
    const chunks = [];
    source.on("data", (c) => chunks.push(c));
    source.on("end", () => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.argv[2] || 4104;
server.listen(PORT, () => console.log(`listening on :${PORT}`));
