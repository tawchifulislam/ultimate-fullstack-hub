const http = require("http");

// /correct calls res.end(); /forgot never does. Node has no idea a response
// is "done" until end() is called, there's no implicit "fall off the end of
// the function, so send what we have." A response left hanging never
// completes, from the client's point of view the server is just not
// responding, even though the handler already ran and finished.
const server = http.createServer((req, res) => {
  if (req.url === "/correct") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("partial content... ");
    res.end("and now it's done.");
    console.log("/correct: handler finished, res.end() was called");
  } else if (req.url === "/forgot") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("partial content... but then nothing else happens.");
    // no res.end() call here, on purpose
    console.log("/forgot: handler finished, but res.end() was NEVER called");
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.argv[2] || 4102;
server.listen(PORT, () => console.log(`listening on :${PORT}`));
