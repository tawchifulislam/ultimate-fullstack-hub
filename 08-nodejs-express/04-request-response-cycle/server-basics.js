const http = require("http");
const { URL } = require("url");

// This is what Express (and every other Node web framework) is built on
// top of: one callback, called once per incoming request, with a request
// stream and a response stream. There is no routing, no body parsing, no
// status-code helpers, Node gives you exactly these two objects and
// nothing else.
const server = http.createServer((req, res) => {
  // req.url is only the path + query string, never parsed for you.
  const parsed = new URL(req.url, `http://${req.headers.host}`);

  console.log(`${req.method} ${parsed.pathname}${parsed.search}`);

  if (req.method === "GET" && parsed.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Home page");
  } else if (req.method === "GET" && parsed.pathname === "/about") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("About page");
  } else if (req.method === "GET" && parsed.pathname === "/json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ hello: "world", query: Object.fromEntries(parsed.searchParams) }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const PORT = process.argv[2] || 4100;
server.listen(PORT, () => console.log(`listening on :${PORT}`));
