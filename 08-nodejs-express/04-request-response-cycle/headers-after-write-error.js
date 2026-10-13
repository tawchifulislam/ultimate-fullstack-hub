const http = require("http");

// Once any part of the response body has been sent, the status code and
// headers are already written to the socket, there's no way to change your
// mind afterward. Node throws ERR_HTTP_HEADERS_SENT rather than silently
// ignoring the mistake.
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.write("first chunk of the body\n");

  try {
    // Too late: headers already went out with the writeHead() call above.
    res.setHeader("X-Too-Late", "yep");
    res.writeHead(201); // changing the status code now, also too late
  } catch (err) {
    console.log("caught error:", err.code, "-", err.message);
    res.write(`(server caught: ${err.code})\n`);
  }

  res.end("final chunk of the body\n");
});

const PORT = process.argv[2] || 4103;
server.listen(PORT, () => console.log(`listening on :${PORT}`));
