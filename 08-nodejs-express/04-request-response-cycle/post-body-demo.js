const http = require("http");

// There is no req.body here. req is a readable stream of the raw request
// bytes, nothing more; "parsing the body" means collecting those chunks
// yourself and deciding what to do with them. This is exactly the work
// Express's express.json() middleware (Topic 6) does for you later.
const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    return res.end("Method Not Allowed");
  }

  const chunks = [];
  let chunkCount = 0;

  req.on("data", (chunk) => {
    chunkCount++;
    chunks.push(chunk);
  });

  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "invalid JSON" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        received: parsed,
        rawByteLength: raw.length,
        chunkCount,
      })
    );
  });

  req.on("error", (err) => {
    console.error("request stream error:", err.message);
  });
});

const PORT = process.argv[2] || 4101;
server.listen(PORT, () => console.log(`listening on :${PORT}`));
